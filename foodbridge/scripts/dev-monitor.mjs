#!/usr/bin/env node

/**
 * FoodBridge Dev Server Auto-Recovery Monitor
 * 
 * Continuously monitors localhost:3000 and automatically restarts the dev server if it crashes.
 * Also exposes a recovery status endpoint for the browser to know when the server is back online.
 */

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const PORT = 3000;
const MONITOR_PORT = 3001;
const HEALTH_CHECK_INTERVAL = 2000; // Check every 2 seconds
const FAILURE_THRESHOLD = 3; // 3 consecutive failures = crash
const RESTART_COOLDOWN = 1000; // Wait before restarting

let devServerProcess = null;
let isMonitoring = false;
let consecutiveFailures = 0;
let serverStatus = 'starting'; // starting, healthy, crashed, restarting
let lastRestartTime = 0;
let recoveryClients = []; // WebSocket-like clients waiting for recovery

/**
 * Check if the dev server is responsive
 */
async function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}`, { timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500); // Any response = healthy
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Start the dev server
 */
function startDevServer() {
  console.log(`[${new Date().toISOString()}] Starting Next.js dev server on port ${PORT}...`);
  serverStatus = 'restarting';
  
  devServerProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit', // Show dev server output in console
    shell: true,
  });

  devServerProcess.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Failed to start dev server:`, err.message);
    serverStatus = 'crashed';
    consecutiveFailures = FAILURE_THRESHOLD;
  });

  devServerProcess.on('exit', (code) => {
    console.warn(`[${new Date().toISOString()}] Dev server exited with code ${code}`);
    serverStatus = 'crashed';
    consecutiveFailures = FAILURE_THRESHOLD;
  });
}

/**
 * Monitor the dev server and restart if needed
 */
async function monitorServer() {
  if (!isMonitoring) return;

  const isHealthy = await healthCheck();

  if (isHealthy) {
    if (serverStatus !== 'healthy') {
      console.log(`[${new Date().toISOString()}] ✓ Dev server is healthy!`);
      serverStatus = 'healthy';
      consecutiveFailures = 0;
      
      // Notify waiting clients that recovery is complete
      recoveryClients.forEach((client) => {
        try {
          client.write(JSON.stringify({ status: 'recovered', timestamp: Date.now() }));
          client.end();
        } catch (e) {
          // Client may have disconnected
        }
      });
      recoveryClients = [];
    }
  } else {
    consecutiveFailures++;
    console.warn(
      `[${new Date().toISOString()}] ✗ Health check failed (${consecutiveFailures}/${FAILURE_THRESHOLD})`
    );

    if (consecutiveFailures >= FAILURE_THRESHOLD && serverStatus !== 'restarting') {
      console.error(`[${new Date().toISOString()}] Dev server crashed! Auto-restarting...`);
      serverStatus = 'crashed';

      // Kill the old process if still running
      if (devServerProcess) {
        try {
          devServerProcess.kill('SIGTERM');
        } catch (e) {
          // Already dead
        }
        devServerProcess = null;
      }

      // Cooldown before restart
      await new Promise((resolve) => setTimeout(resolve, RESTART_COOLDOWN));

      if (Date.now() - lastRestartTime > RESTART_COOLDOWN) {
        lastRestartTime = Date.now();
        consecutiveFailures = 0;
        startDevServer();

        // Wait for server to come back up (up to 15 seconds)
        let waitCount = 0;
        const waitInterval = setInterval(async () => {
          waitCount++;
          const healthy = await healthCheck();
          if (healthy || waitCount > 15) {
            clearInterval(waitInterval);
            if (healthy) {
              console.log(`[${new Date().toISOString()}] ✓ Dev server recovered!`);
              serverStatus = 'healthy';
              consecutiveFailures = 0;
            } else {
              console.error(`[${new Date().toISOString()}] Failed to recover after restart.`);
              serverStatus = 'crashed';
            }
          }
        }, 1000);
      }
    }
  }

  // Schedule next check
  setTimeout(monitorServer, HEALTH_CHECK_INTERVAL);
}

/**
 * Start the monitoring server (exposes recovery status endpoint)
 */
function startMonitoringServer() {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/api/monitor/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: serverStatus,
          timestamp: Date.now(),
          devServerPort: PORT,
          uptime: process.uptime(),
        })
      );
      return;
    }

    // Recovery wait endpoint (long-poll for recovery notification)
    if (req.url === '/api/monitor/wait-for-recovery') {
      if (serverStatus === 'healthy') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'recovered', timestamp: Date.now() }));
      } else {
        // Keep connection open and notify when recovered
        recoveryClients.push(res);

        // Timeout after 60 seconds
        const timeout = setTimeout(() => {
          const idx = recoveryClients.indexOf(res);
          if (idx !== -1) recoveryClients.splice(idx, 1);
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'timeout' }));
          }
        }, 60000);

        req.on('close', () => {
          clearTimeout(timeout);
          const idx = recoveryClients.indexOf(res);
          if (idx !== -1) recoveryClients.splice(idx, 1);
        });
      }
      return;
    }

    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(MONITOR_PORT, () => {
    console.log(`[${new Date().toISOString()}] Monitor server listening on http://localhost:${MONITOR_PORT}`);
    console.log(`[${new Date().toISOString()}] Status endpoint: http://localhost:${MONITOR_PORT}/api/monitor/status`);
  });

  server.on('error', (err) => {
    console.error(`Monitor server error:`, err.message);
  });
}

/**
 * Initialize and start monitoring
 */
function init() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  FoodBridge Dev Server Auto-Recovery Monitor              ║');
  console.log('║  Monitoring localhost:3000 for crashes...                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  isMonitoring = true;

  // Start the dev server
  startDevServer();

  // Start the monitoring server (exposes status endpoint)
  startMonitoringServer();

  // Begin health checks
  setTimeout(monitorServer, HEALTH_CHECK_INTERVAL);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n[${new Date().toISOString()}] Shutting down monitor...`);
    isMonitoring = false;
    if (devServerProcess) {
      devServerProcess.kill('SIGTERM');
    }
    process.exit(0);
  });
}

init();
