# Quick Start: Auto-Recovery

## What You Get

Instead of this frustration:
```
😤 "localhost refused to connect"
😤 Manually kill the server
😤 Manually restart: npm run dev
😤 Wait 5+ seconds
😤 Manually refresh browser
😤 Back to work...
```

You get this:
```
💥 Dev server crashes
🤖 Auto-recovery banner appears
⏳ Automatic restart begins...
✅ Page reloads automatically in ~10 seconds
🚀 Back to work!
```

---

## Setup (One-time)

### Windows Users

**Option 1: Click the batch file**
```
launch-foodbridge.bat
```

**Option 2: Terminal command**
```bash
cd D:\final year2\foodbridge
npm run monitor
```

### Mac/Linux Users

```bash
cd ~/path/to/foodbridge
npm run monitor
```

---

## What to Expect

### On Startup
```
╔════════════════════════════════════════════════════════════╗
║  FoodBridge Dev Server Auto-Recovery Monitor              ║
║  Monitoring localhost:3000 for crashes...                 ║
╚════════════════════════════════════════════════════════════╝

[2026-05-12T10:30:45.123Z] Starting Next.js dev server on port 3000...
[2026-05-12T10:30:46.234Z] Monitor server listening on http://localhost:3001
[2026-05-12T10:30:47.890Z] ✓ Dev server is healthy!
```

### Browser Opens
```
✅ Page loads normally to http://localhost:3000
✅ Recovery banner is there but hidden (ready if needed)
```

### If Server Crashes
```
[2026-05-12T10:35:22.456Z] ✗ Health check failed (1/3)
[2026-05-12T10:35:24.567Z] ✗ Health check failed (2/3)
[2026-05-12T10:35:26.678Z] ✗ Health check failed (3/3)
[2026-05-12T10:35:26.789Z] Dev server crashed! Auto-restarting...
```

**In browser:**
```
┌─────────────────────────────────────────────────┐
│ 🟡 Dev Server Recovering                        │
│ The dev server crashed. Auto-recovery is in     │
│ progress...                                     │
│ [██░░░░░░░░░░░░░] 20%                          │
│ Page will reload automatically when server is   │
│ back online.                                    │
└─────────────────────────────────────────────────┘
```

### Recovery Complete
```
[2026-05-12T10:35:30.123Z] Starting Next.js dev server on port 3000...
[2026-05-12T10:35:32.456Z] ✓ Dev server is healthy!
```

**In browser:**
```
✅ Banner disappears
✅ Page reloads automatically
✅ App is live again!
```

---

## Browser Console (Developer Tools)

### Normal Operation
```
[Dev Recovery] ✓ Server recovered! Reloading...
```

### When Server is Down
```
[Dev Recovery] ✗ Server connection lost, waiting for recovery...
[Dev Recovery] ✓ Recovery signal received! Reloading...
```

---

## Stopping the Monitor

### Windows
- Close the "FoodBridge Dev Server Monitor" terminal window
- Or press `Ctrl+C` in the terminal

### Mac/Linux
```bash
# In the terminal running npm run monitor
Ctrl+C
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Browser still shows "localhost refused to connect" after restart** | Click "Reload" button or wait 2-3 seconds, then refresh |
| **Banner appears but doesn't go away** | Check browser console (F12) for errors. Monitor may have crashed. |
| **Port 3001 already in use** | Kill the process using it: `lsof -i :3001` → `kill -9 <PID>` |
| **Monitor starts but dev server won't start** | Check `package.json` and `node_modules` are intact |

---

## Advanced: Viewing Monitor Status

While the app is running, you can check the monitor status:

```bash
# In PowerShell / Terminal
curl http://localhost:3001/api/monitor/status | ConvertTo-Json

# Output:
# {
#   "status": "healthy",
#   "timestamp": 1715509845123,
#   "devServerPort": 3000,
#   "uptime": 245.67
# }
```

---

## Need More Details?

📖 See `docs/DEV_SERVER_AUTO_RECOVERY.md` for full technical documentation.
