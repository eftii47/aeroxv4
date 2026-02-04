import { Router } from 'express';
import { requireAuth, requireOwner, requireGuildAccess } from '../auth.js';
import { db } from '#database/DatabaseManager';
import { config } from '#config/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApiRouter = () => {
  const router = Router();

  // ============== BOT STATS ==============
  router.get('/stats', async (req, res) => {
    try {
      const manager = req.manager;
      const client = req.client;
      
      // If we have a cluster manager, use it for stats
      if (manager) {
        try {
          const [guilds, users, channels] = await Promise.all([
            manager.fetchClientValues('guilds.cache.size'),
            manager.fetchClientValues('users.cache.size'),
            manager.fetchClientValues('channels.cache.size'),
          ]);

          // Get command count from file system
          const commandsPath = path.resolve(__dirname, '..', '..', 'commands');
          let commandCount = 0;
          const countCommands = (dir) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                countCommands(path.join(dir, entry.name));
              } else if (entry.name.endsWith('.js')) {
                commandCount++;
              }
            }
          };
          countCommands(commandsPath);

          return res.json({
            status: 'online',
            guilds: guilds.reduce((a, b) => a + b, 0),
            users: users.reduce((a, b) => a + b, 0),
            channels: channels.reduce((a, b) => a + b, 0),
            commands: commandCount,
            shards: manager.totalShards || 4,
            clusters: manager.totalClusters || 4,
            memory: process.memoryUsage(),
            uptime: process.uptime() * 1000,
          });
        } catch (e) {
          // Fall through to offline response
        }
      }
      
      // Fallback for when manager is not ready
      if (client && client.isReady()) {
        return res.json({
          status: 'online',
          guilds: client.guilds.cache.size,
          users: client.users.cache.size,
          channels: client.channels.cache.size,
          commands: client.commands?.size || 0,
          slashCommands: client.slashCommands?.size || 0,
          uptime: client.uptime,
          ping: client.ws.ping,
          shards: 1,
          memory: process.memoryUsage(),
        });
      }

      res.json({
        status: 'offline',
        guilds: 0,
        users: 0,
        channels: 0,
        commands: 0,
        uptime: 0,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== COMMANDS ==============
  router.get('/commands', async (req, res) => {
    try {
      const commandsPath = path.resolve(__dirname, '..', '..', 'commands');
      const commands = [];
      
      const walkDir = (dir, category = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(entryPath, category ? `${category}/${entry.name}` : entry.name);
          } else if (entry.name.endsWith('.js')) {
            try {
              const content = fs.readFileSync(entryPath, 'utf8');
              const name = extractField(content, 'name');
              const description = extractField(content, 'description');
              const usage = extractField(content, 'usage');
              const aliases = extractArrayField(content, 'aliases');
              const enabledSlash = content.includes('enabledSlash: true');
              const cooldown = extractNumberField(content, 'cooldown');
              
              if (name) {
                commands.push({
                  name,
                  description: description || 'No description',
                  usage: usage || name,
                  aliases,
                  enabledSlash,
                  cooldown: cooldown || 3,
                  category: category || 'uncategorized',
                  file: entry.name,
                });
              }
            } catch (e) {
              // Skip files that can't be parsed
            }
          }
        }
      };
      
      if (fs.existsSync(commandsPath)) {
        walkDir(commandsPath);
      }
      
      // Group by category
      const categories = {};
      for (const cmd of commands) {
        const cat = cmd.category.split('/')[0];
        if (!categories[cat]) {
          categories[cat] = [];
        }
        categories[cat].push(cmd);
      }
      
      res.json({ commands, categories, total: commands.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== GUILDS ==============
  router.get('/guilds', requireAuth, async (req, res) => {
    try {
      const manager = req.manager;
      const client = req.client;
      const userGuilds = req.session.guilds || [];
      
      // Filter guilds where user has manage permission
      const managableGuilds = userGuilds.filter(g => {
        const hasPermission = (parseInt(g.permissions) & 0x20) === 0x20;
        return hasPermission;
      });

      // Get all bot guild IDs from manager
      let botGuildIds = [];
      if (manager) {
        try {
          const allGuildIds = await manager.fetchClientValues('guilds.cache.keys()');
          botGuildIds = allGuildIds.flat().map(id => String(id));
        } catch (e) {
          // Fallback to client cache
          if (client?.guilds?.cache) {
            botGuildIds = Array.from(client.guilds.cache.keys());
          }
        }
      } else if (client?.guilds?.cache) {
        botGuildIds = Array.from(client.guilds.cache.keys());
      }

      // Check which guilds the bot is in
      const guildsWithBot = managableGuilds.map(guild => ({
        ...guild,
        botPresent: botGuildIds.includes(guild.id),
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
      }));

      res.json({ guilds: guildsWithBot });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== GUILD SETTINGS ==============
  router.get('/guilds/:guildId', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      
      const guild = client?.guilds?.cache?.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Bot is not in this guild' });
      }

      const prefixes = db.getPrefixes(guildId);
      const isBlacklisted = db.isGuildBlacklisted(guildId);
      const isPremium = db.isGuildPremium(guildId);
      const inviteTracking = db.isInviteTrackingEnabled(guildId);
      const ticketPanels = db.getAllTicketPanels(guildId);
      const inviteRanks = db.getInviteRanks(guildId);

      res.json({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size,
        settings: {
          prefixes,
          isBlacklisted,
          isPremium,
          inviteTracking,
          ticketPanels: ticketPanels.length,
          inviteRanks: inviteRanks.length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update guild prefix
  router.post('/guilds/:guildId/prefix', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { prefixes } = req.body;
      
      if (!Array.isArray(prefixes) || prefixes.length === 0) {
        return res.status(400).json({ error: 'Prefixes must be a non-empty array' });
      }
      
      db.setPrefixes(guildId, prefixes);
      res.json({ success: true, prefixes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== MODERATION ==============
  router.get('/guilds/:guildId/moderation', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      const guild = client?.guilds?.cache?.get(guildId);
      
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      // Get all mutes and warns for the guild
      const openTickets = db.getAllOpenTickets(guildId);
      const ticketStats = db.getTicketStats(guildId);

      res.json({
        openTickets: openTickets.length,
        ticketStats,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user moderation data
  router.get('/guilds/:guildId/users/:userId/moderation', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      
      const warns = db.getWarns(guildId, userId);
      const muteHistory = db.getMuteHistory(guildId, userId);
      const activeMute = db.getActiveMute(guildId, userId);

      res.json({
        warns,
        warnCount: warns.length,
        muteHistory,
        activeMute,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reset user warns
  router.delete('/guilds/:guildId/users/:userId/warns', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      db.resetWarns(guildId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reset user mutes
  router.delete('/guilds/:guildId/users/:userId/mutes', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      db.resetMutes(guildId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== TICKETS ==============
  router.get('/guilds/:guildId/tickets', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      
      const panels = db.getAllTicketPanels(guildId);
      const openTickets = db.getAllOpenTickets(guildId);
      const stats = db.getTicketStats(guildId);

      res.json({ panels, openTickets, stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/guilds/:guildId/tickets/panels/:panelId', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId, panelId } = req.params;
      db.deleteTicketPanel(guildId, panelId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== INVITES ==============
  router.get('/guilds/:guildId/invites', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      
      const enabled = db.isInviteTrackingEnabled(guildId);
      const leaderboard = db.getInviteLeaderboard(guildId, 25);
      const ranks = db.getInviteRanks(guildId);

      res.json({ enabled, leaderboard, ranks });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/guilds/:guildId/invites/tracking', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { enabled } = req.body;
      
      db.setInviteTracking(guildId, enabled);
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/guilds/:guildId/invites/ranks', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { roleId, invitesRequired } = req.body;
      
      db.addInviteRank(guildId, roleId, invitesRequired);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/guilds/:guildId/invites/ranks/:roleId', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId, roleId } = req.params;
      db.removeInviteRank(guildId, roleId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== PREMIUM (OWNER ONLY) ==============
  router.get('/premium', requireOwner, async (req, res) => {
    try {
      // This would need a method to list all premium entries
      res.json({ message: 'Premium management endpoint' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/premium/user', requireOwner, async (req, res) => {
    try {
      const { userId, expiresAt, reason } = req.body;
      const grantedBy = req.session.user.id;
      
      db.grantUserPremium(userId, grantedBy, expiresAt || null, reason || 'Granted via dashboard');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/premium/user/:userId', requireOwner, async (req, res) => {
    try {
      const { userId } = req.params;
      db.revokeUserPremium(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/premium/guild', requireOwner, async (req, res) => {
    try {
      const { guildId, expiresAt, reason } = req.body;
      const grantedBy = req.session.user.id;
      
      db.grantGuildPremium(guildId, grantedBy, expiresAt || null, reason || 'Granted via dashboard');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/premium/guild/:guildId', requireOwner, async (req, res) => {
    try {
      const { guildId } = req.params;
      db.revokeGuildPremium(guildId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== BLACKLIST (OWNER ONLY) ==============
  router.post('/blacklist/user', requireOwner, async (req, res) => {
    try {
      const { userId, reason } = req.body;
      db.blacklistUser(userId, reason || 'Blacklisted via dashboard');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/blacklist/user/:userId', requireOwner, async (req, res) => {
    try {
      const { userId } = req.params;
      db.unblacklistUser(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/blacklist/guild', requireOwner, async (req, res) => {
    try {
      const { guildId, reason } = req.body;
      db.blacklistGuild(guildId, reason || 'Blacklisted via dashboard');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/blacklist/guild/:guildId', requireOwner, async (req, res) => {
    try {
      const { guildId } = req.params;
      db.unblacklistGuild(guildId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== MUSIC (if player exists) ==============
  router.get('/guilds/:guildId/music', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      
      const player = client?.music?.players?.get(guildId);
      if (!player) {
        return res.json({ active: false });
      }

      res.json({
        active: true,
        playing: player.playing,
        paused: player.paused,
        volume: player.volume,
        position: player.position,
        queue: player.queue?.tracks?.slice(0, 10) || [],
        queueSize: player.queue?.tracks?.length || 0,
        current: player.queue?.current || null,
        loop: player.repeatMode,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/guilds/:guildId/music/pause', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      const player = client?.music?.players?.get(guildId);
      
      if (!player) {
        return res.status(404).json({ error: 'No active player' });
      }

      await player.pause(!player.paused);
      res.json({ success: true, paused: player.paused });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/guilds/:guildId/music/skip', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      const player = client?.music?.players?.get(guildId);
      
      if (!player) {
        return res.status(404).json({ error: 'No active player' });
      }

      await player.skip();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/guilds/:guildId/music/stop', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      const player = client?.music?.players?.get(guildId);
      
      if (!player) {
        return res.status(404).json({ error: 'No active player' });
      }

      await player.destroy();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/guilds/:guildId/music/volume', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const { volume } = req.body;
      const client = req.client;
      const player = client?.music?.players?.get(guildId);
      
      if (!player) {
        return res.status(404).json({ error: 'No active player' });
      }

      await player.setVolume(Math.max(0, Math.min(150, volume)));
      res.json({ success: true, volume: player.volume });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== GUILD CHANNELS & ROLES ==============
  router.get('/guilds/:guildId/channels', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      const guild = client?.guilds?.cache?.get(guildId);
      
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      const channels = guild.channels.cache.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parentId: ch.parentId,
      }));

      res.json({ channels });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/guilds/:guildId/roles', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { guildId } = req.params;
      const client = req.client;
      const guild = client?.guilds?.cache?.get(guildId);
      
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id) // Exclude @everyone
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.hexColor,
          position: r.position,
        }))
        .sort((a, b) => b.position - a.position);

      res.json({ roles });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

// Helper functions
function extractField(content, fieldName) {
  const regex = new RegExp(`${fieldName}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

function extractArrayField(content, fieldName) {
  const regex = new RegExp(`${fieldName}\\s*:\\s*\\[([^\\]]+)\\]`, 'm');
  const match = content.match(regex);
  if (!match) return [];
  const items = [];
  const itemRegex = /["'`]([^"'`]+)["'`]/g;
  let item;
  while ((item = itemRegex.exec(match[1])) !== null) {
    items.push(item[1]);
  }
  return items;
}

function extractNumberField(content, fieldName) {
  const regex = new RegExp(`${fieldName}\\s*:\\s*(\\d+)`, 'm');
  const match = content.match(regex);
  return match ? parseInt(match[1]) : null;
}
