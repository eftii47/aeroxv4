import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '#config/config';
import { logger } from '#utils/logger';
import { createApiRouter } from './api/index.js';
import { createAuthRouter } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DashboardServer {
  constructor(client, port = null) {
    this.client = client;
    this.manager = null;
    this.app = express();
    this.port = port || process.env.DASHBOARD_PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setClient(client) {
    this.client = client;
  }

  setManager(manager) {
    this.manager = manager;
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Session for OAuth2
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'aerox-dashboard-secret-key-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    }));

    // CORS for API
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Attach client and manager to request
    this.app.use((req, res, next) => {
      req.client = this.client;
      req.manager = this.manager;
      next();
    });

    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // Auth routes
    this.app.use('/auth', createAuthRouter());
    
    // API routes
    this.app.use('/api', createApiRouter());

    // Serve dashboard frontend for all other routes (SPA fallback)
    this.app.use((req, res, next) => {
      // Skip API and auth routes
      if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
        return next();
      }
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          logger.success('Dashboard', `Dashboard server running on http://localhost:${this.port}`);
          resolve(this.server);
        });
      } catch (error) {
        logger.error('Dashboard', 'Failed to start dashboard server', error);
        reject(error);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      logger.info('Dashboard', 'Dashboard server stopped');
    }
  }
}

export const createDashboard = (client, port = null) => new DashboardServer(client, port);
