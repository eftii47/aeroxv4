import { Router } from 'express';
import { config } from '#config/config';

const DISCORD_API = 'https://discord.com/api/v10';
const REDIRECT_URI = process.env.DASHBOARD_CALLBACK_URL || 'http://localhost:3000/auth/callback';

export const createAuthRouter = () => {
  const router = Router();

  // Login - redirect to Discord OAuth2
  router.get('/login', (req, res) => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  // OAuth2 callback
  router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.redirect('/?error=no_code');
    }

    try {
      // Exchange code for token
      const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokens = await tokenResponse.json();
      
      // Debug logging
      if (!tokenResponse.ok) {
        console.error('OAuth token error:', tokens);
        return res.redirect(`/?error=token_failed&details=${encodeURIComponent(tokens.error || 'unknown')}`);
      }
      
      if (!tokens.access_token) {
        console.error('No access token in response:', tokens);
        return res.redirect('/?error=token_failed');
      }

      // Get user info
      const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userResponse.json();

      // Get user guilds
      const guildsResponse = await fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const guilds = await guildsResponse.json();

      // Store in session
      req.session.user = user;
      req.session.guilds = guilds;
      req.session.accessToken = tokens.access_token;
      req.session.refreshToken = tokens.refresh_token;
      req.session.isOwner = config.ownerIds.includes(user.id);

      res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  // Logout
  router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  // Get current user
  router.get('/me', (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
      user: req.session.user,
      guilds: req.session.guilds,
      isOwner: req.session.isOwner,
    });
  });

  return router;
};

// Auth middleware
export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export const requireOwner = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.session.isOwner) {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
};

export const requireGuildAccess = (req, res, next) => {
  const guildId = req.params.guildId || req.body.guildId;
  if (!guildId) {
    return res.status(400).json({ error: 'Guild ID required' });
  }
  
  const userGuilds = req.session.guilds || [];
  const guild = userGuilds.find(g => g.id === guildId);
  
  // Check if user has MANAGE_GUILD permission (0x20) or is owner
  const hasPermission = guild && ((parseInt(guild.permissions) & 0x20) === 0x20 || req.session.isOwner);
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'No permission to manage this guild' });
  }
  
  next();
};
