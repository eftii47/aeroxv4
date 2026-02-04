import { ClusterManager, HeartbeatManager } from 'discord-hybrid-sharding';

import { config } from '#config/config';
import { logger } from '#utils/logger';
import './healthcheck.js'; // Start health check server on port 5000

// Lazy load dashboard to ensure env vars are loaded
let dashboard = null;
const initDashboard = async () => {
  const { createDashboard } = await import('./dashboard/server.js');
  const dashboardPort = parseInt(process.env.DASHBOARD_PORT) || 3000;
  dashboard = createDashboard(null, dashboardPort);
  return dashboard;
};

const manager = new ClusterManager('./src/index.js', {
        totalShards: 4,
        shardsPerCluster: 1,
        mode: 'process',
        token: config.token,
        respawn: true,
        restartMode: 'gracefulSwitch',
});

manager.extend(
        new HeartbeatManager({
                interval: 2000,
                maxMissedHeartbeats: 5,
        }),
);

manager.on('clusterCreate', cluster => {
        logger.info(
                'ClusterManager',
                ` ==> Launched Cluster ${cluster.id} [${cluster.shardList.join(', ')}]`,
        );
        cluster.on('clientReady', () =>
                logger.success('ClusterManager', `Cluster ${cluster.id} ==> Ready`),
        );
        cluster.on('reconnecting', () =>
                logger.warn(
                        'ClusterManager',
                        `Cluster ${cluster.id} ==> Reconnecting...`,
                ),
        );
        cluster.on('death', (p, code) =>
                logger.error(
                        'ClusterManager',
                        `Cluster ${cluster.id} ==> Died with exit code ${code}. Respawning...`,
                ),
        );
        cluster.on('error', e =>
                logger.error(
                        'ClusterManager',
                        `Cluster ${cluster.id} ==> An error occurred:`,
                        e,
                ),
        );
});

manager.on('debug', msg => {
        if (!msg.includes('Heartbeat')) {
                logger.debug('ClusterManager', msg);
        }
});

const shutdown = () => {
        logger.info('ClusterManager', ' ==> Shutting down all clusters...');
        process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

        manager
                .spawn({ timeout: -1 })
                .then(async () => {
                        logger.success('ClusterManager', ' ==> All clusters are loaded and bot is ready! 🚀');
                        // Start the dashboard with access to the cluster manager
                        const dash = await initDashboard();
                        dash.setManager(manager);
                        dash.start();
                })
                .catch(error =>
                        logger.error('ClusterManager', ' ==> Error during spawn:', error),
                );
