# FoodBridge Dev Server Auto-Recovery

## Overview

The auto-recovery system detects when the Next.js development server crashes or stops responding and **automatically restarts it without manual intervention**. When the server comes back online, the browser is automatically notified and reloads the application.

This eliminates the frustrating "localhost refused to connect" errors and recovery delays during development.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React App at localhost:3000)                       │
│ ├─ DevServerRecoveryBanner (UI component)                   │
│ └─ useDevServerRecovery (detection & reload logic)          │
└────────────────┬────────────────────────────────────────────┘
                 │ Health checks & recovery signals
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Monitor Server (localhost:3001)                             │
│ ├─ /api/monitor/status (returns server status)              │
│ └─ /api/monitor/wait-for-recovery (long-poll for recovery)  │
└────────────────┬────────────────────────────────────────────┘
                 │ Manages dev server process
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Next.js Dev Server (localhost:3000)                         │
│ ├─ Continuously monitored for health                        │
│ └─ Auto-restarted on crash/timeout                          │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **Dev Monitor Daemon** (`scripts/dev-monitor.mjs`)
- Runs continuously on port 3001
- **Health checks:** Pings localhost:3000 every 2 seconds
- **Auto-restart logic:** After 3 consecutive failures, kills and restarts the dev server
- **Recovery tracking:** Notifies waiting clients when the server is back online
- **Graceful degradation:** Falls back to manual restart if auto-recovery fails repeatedly

#### 2. **React Recovery Hook** (`src/hooks/useDevServerRecovery.ts`)
- `useDevServerRecovery()` - Hook for monitoring server health
- `DevServerRecoveryBanner` - UI component showing recovery status
- **Detection:** Polls the monitor server every 3 seconds
- **Long-poll:** Waits for recovery notification (up to 60 seconds)
- **Auto-reload:** Automatically reloads the page when server is healthy

#### 3. **Updated Launch Script** (`launch-foodbridge.bat`)
- Starts the monitor daemon instead of the dev server directly
- Maintains backward compatibility with existing startup workflow

---

## Usage

### Option 1: Using the Launch Script (Recommended - Windows)

```bash
# From the project root
launch-foodbridge.bat
```

This will:
1. Check if a server is already running on port 3000
2. If not, start the monitor daemon (which starts the dev server)
3. Open Chrome to http://localhost:3000
4. **Auto-recovery is now active in the background**

### Option 2: Manual Monitor Start

```bash
npm run monitor
```

Then in another terminal:
```bash
# If you want to see dev server output
npm run dev
```

### Option 3: Direct Development (Without Monitor)

```bash
# Traditional development - no auto-recovery
npm run dev
```

**Note:** Without the monitor, you'll need to manually restart the server if it crashes.

---

## What Happens When the Server Crashes

### Step 1: Failure Detection (0-2 seconds)
The browser detects that localhost:3000 is unreachable:
```javascript
// Connection attempt fails
fetch('http://localhost:3000') → ERR_CONNECTION_REFUSED
```

### Step 2: Recovery Message (2 seconds)
A recovery banner appears at the bottom of the screen:
```
┌─────────────────────────────────────┐
│ 🟡 Dev Server Recovering            │
│ The dev server crashed. Auto-        │
│ recovery is in progress...          │
│ [=====░░░░░░░] (progress bar)       │
│ Page will reload automatically.     │
└─────────────────────────────────────┘
```

### Step 3: Monitor Server Restarts Dev Server
The monitor daemon detects the failure and:
1. Kills the crashed Next.js process
2. Waits 1 second (cooldown)
3. Spawns a new dev server process
4. Monitors until it responds to requests

### Step 4: Browser Detects Recovery
The browser's long-poll request completes:
```javascript
GET http://localhost:3001/api/monitor/wait-for-recovery
// Response: { status: "recovered", timestamp: 1234567890 }
```

### Step 5: Auto-Reload
The banner disappears and the page reloads automatically, showing your application again.

**Total recovery time:** 5-15 seconds (depending on how fast Next.js restarts)

---

## Configuration

You can customize the auto-recovery behavior by editing `scripts/dev-monitor.mjs`:

```javascript
const PORT = 3000;                      // Dev server port
const MONITOR_PORT = 3001;              // Monitor server port
const HEALTH_CHECK_INTERVAL = 2000;     // Check every 2 seconds
const FAILURE_THRESHOLD = 3;            // 3 failures = crash
const RESTART_COOLDOWN = 1000;          // 1 second cooldown before restart
```

---

## Browser Console Messages

When auto-recovery is active, you'll see console logs like:

```
[Dev Recovery] ✗ Server connection lost, waiting for recovery...
[Dev Recovery] ✓ Recovery signal received! Reloading...
[Dev Recovery] ✓ Server recovered! Reloading...
```

---

## Troubleshooting

### Monitor Server Won't Start

**Error:** `Address already in use`
- Another process is using port 3001
- Solution: Kill the process or change `MONITOR_PORT` in `scripts/dev-monitor.mjs`

```bash
# Find and kill the process
lsof -i :3001
kill -9 <PID>
```

### Dev Server Keeps Restarting

**Cause:** Infinite restart loop (check for compilation errors)
- Solution: Look at the dev server console output for errors
- The monitor will give up after repeated failures

### Banner Not Appearing

**Cause:** `useDevServerRecovery` only runs in development mode
- Ensure `NODE_ENV === 'development'`
- Check browser console for errors

### Monitor Server Not Responding

**Cause:** Monitor process crashed
- Solution: Restart manually with `npm run monitor`
- Check for missing dependencies or port conflicts

---

## Performance Impact

- **Monitor daemon:** ~5MB memory, negligible CPU (sleeps between checks)
- **Browser hook:** Minimal impact - only active during development
- **Health checks:** 1 HTTP request every 2 seconds (very lightweight)
- **Long-polls:** One active connection per browser tab (resets every 60s)

---

## Security Notes

⚠️ **Only for development!**

The monitor server:
- Listens on `localhost:3001` (not exposed to the internet)
- Has no authentication (assumes trusted local network)
- Should never be deployed to production

---

## Future Enhancements

- [ ] WebSocket support for instant recovery notifications
- [ ] Slack/Discord notifications on repeated crashes
- [ ] Dev server error log streaming to browser console
- [ ] Recovery statistics dashboard
- [ ] Integration with VS Code dev container monitoring
