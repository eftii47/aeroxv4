import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from bot folder root (two levels up from src/config/)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export const config = {
  // Bot authentication token from Discord Developer Portal
  token: process.env.DISCORD_TOKEN,
  
  // Discord application client ID (found in Developer Portal)
  clientId: process.env.CLIENT_ID,
  
  // Command prefix for text-based commands (default: '.')
  prefix: process.env.PREFIX || '.',
  
  // Array of Discord user IDs with owner privileges
  // Multiple IDs should be comma-separated in .env file
  ownerIds: (process.env.OWNER_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
  
  // Lavalink node configuration for music streaming
  // Supports multiple nodes for load balancing and redundancy
  // Default: TriniumHost v4 node (fallback if env vars not set)
  nodes: [
    {
      id: process.env.LAVALINK_ID || "main-node",
      host: process.env.LAVALINK_HOST || "140.238.179.182",
      port: parseInt(process.env.LAVALINK_PORT) || 2333,
      authorization: process.env.LAVALINK_PASSWORD || "kirito",
      secure: process.env.LAVALINK_SECURE === 'true',
      retryAmount: Infinity,
      retryDelay: 10000,
    },
  ],
  
  // Application environment (development/production)
  environment: process.env.NODE_ENV || 'development',
  
  // Enable debug logging (auto-enabled in development mode)
  debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',
  
  // Database file paths for different data types
  // Using .bread extension for Better-SQLite3 databases
  database: {
    guild: './database/data/guild.bread',
    user: './database/data/user.bread',
    premium: './database/data/premium.bread',
    antiabuse: './database/data/antiabuse.bread',
    playlists: './database/data/playlists.bread',
    ticket: './database/data/ticket.bread',
    invites: './database/data/invites.bread',
  },
  
  // External links and resources
  links: {
    supportServer: process.env.SUPPORT_SERVER_URL || "https://discord.gg/aerox"
  },
  
  // Bot presence/status configuration
  status: {
    name: process.env.STATUS_TEXT || '!help | Discord Bot',
    status: process.env.STATUS_TYPE || 'dnd', // online, idle, dnd, invisible
    type: 'CUSTOM' // Activity type
  },
  
  // Embed color scheme (hex values)
  colors: {
    info: '#3498db',     // Blue - informational messages
    success: '#2ecc71',  // Green - success messages
    warning: '#f39c12',  // Orange - warning messages
    error: '#e74c3c'     // Red - error messages
  },
  
  // Discord webhook configuration for logging bot events
  webhook: {
    enabled: process.env.WEBHOOK_ENABLED !== 'false',
    url: process.env.WEBHOOK_URL || null,
    username: process.env.WEBHOOK_USERNAME || 'Bot Logger',
    avatarUrl: process.env.WEBHOOK_AVATAR_URL || null,
    // Configure which log levels should be sent to webhook
    levels: {
      info: {
        enabled: process.env.WEBHOOK_INFO_ENABLED !== 'false'
      },
      success: {
        enabled: process.env.WEBHOOK_SUCCESS_ENABLED !== 'false'
      },
      warning: {
        enabled: process.env.WEBHOOK_WARNING_ENABLED !== 'false'
      },
      error: {
        enabled: process.env.WEBHOOK_ERROR_ENABLED !== 'false'
      },
      debug: {
        enabled: process.env.WEBHOOK_DEBUG_ENABLED === 'true'
      }
    }
  },
  
  // Bot feature toggles
  features: {
    stay247: true // Keep bot in voice channel 24/7 when enabled
  },
  
  // Queue limitations based on user tier
  queue: {
    maxSongs: {
      free: 50,      // Maximum songs for free users
      premium: 200   // Maximum songs for premium users
    }
  },
  
  // Default image assets for embeds
  assets: {
    defaultTrackArtwork: process.env.DEFAULT_TRACK_ARTWORK || null,
    defaultThumbnail: process.env.DEFAULT_THUMBNAIL || null,
    helpThumbnail: process.env.HELP_THUMBNAIL || null,
    bannerUrl: process.env.BANNER_URL || null,
  },
  
  // Helper function to safely get thumbnail URL (returns null if not set)
  getThumbnailUrl(url) {
    return url || null;
  },
  
  // Spotify API credentials for track searching
  // Get these from https://developer.spotify.com/dashboard
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  },
  
  // Last.fm API configuration for music metadata
  // Get API key from https://www.last.fm/api
  lastfm: {
    apiKey: process.env.LASTFM_API_KEY
  },
  
  // Music search configuration
  search: {
    maxResults: 6, // Maximum search results to display
    // Default sources to search from (YouTube, Spotify, Apple Music, SoundCloud)
    defaultSources: ['ytsearch']
  },
  
  // Music player default settings
  player: {
    defaultVolume: 100,        // Default volume level (0-100)
    seekStep: 10000,           // Seek forward/backward step in milliseconds (10s)
    maxHistorySize: 50,        // Maximum number of previously played tracks to keep
    // 24/7 mode configuration
    stay247: {
      reconnectDelay: 5000,         // Delay before reconnection attempt (ms)
      maxReconnectAttempts: 3,      // Maximum reconnection attempts
      checkInterval: 30000          // Interval to check connection status (ms)
    },
    // Audio quality settings - Maximum quality
    audioQuality: {
      bitrate: 320,              // Maximum bitrate in kbps (320 = highest quality)
      sampleRate: 48000,         // Sample rate in Hz (48000 = CD quality)
      channels: 2,               // Stereo audio
      bufferSize: 8192,          // Larger buffer for smoother playback
      highWaterMark: 1048576,    // 1MB buffer for stability
    }
  },
  
  // Bot metadata
  watermark: 'coded by Shinchan',
  version: '2.0.0'
};
