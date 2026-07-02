/**
 * useDevServerRecovery Hook
 * 
 * Detects when the dev server crashes and automatically reloads the page
 * when it comes back online. Only active during development.
 */

'use client';

import { useEffect, useState } from 'react';

const MONITOR_SERVER_URL = 'http://localhost:3001';
const STATUS_CHECK_INTERVAL = 3000; // Check every 3 seconds
const SHOW_RECOVERY_UI_DELAY = 2000; // Show recovery message after 2 seconds of failure

interface RecoveryState {
  isDown: boolean;
  showMessage: boolean;
  recoveryProgress: number; // 0-100
}

export function useDevServerRecovery() {
  const [state, setState] = useState<RecoveryState>({
    isDown: false,
    showMessage: false,
    recoveryProgress: 0,
  });

  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    let failureTimeout: NodeJS.Timeout;
    let statusCheckInterval: NodeJS.Timeout;
    let recoveryCheckInterval: NodeJS.Timeout;
    let recoveryTimeout: NodeJS.Timeout;

    const checkServerHealth = async () => {
      try {
        const response = await fetch(`${MONITOR_SERVER_URL}/api/monitor/status`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });

        if (!response.ok) throw new Error('Status check failed');

        const data = await response.json();

        // Server is healthy
        if (data.status === 'healthy' && state.isDown) {
          console.log('[Dev Recovery] ✓ Server recovered! Reloading...');
          setState({ isDown: false, showMessage: false, recoveryProgress: 100 });

          // Delay reload slightly to ensure server is fully ready
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else if (data.status === 'healthy') {
          // Still healthy, reset any pending failures
          if (state.isDown) {
            setState({ isDown: false, showMessage: false, recoveryProgress: 0 });
          }
        }
      } catch (error) {
        // Monitor server not responding or dev server is down
        if (!state.isDown) {
          console.warn('[Dev Recovery] ✗ Server connection lost, waiting for recovery...');
          setState({ isDown: true, showMessage: false, recoveryProgress: 0 });

          // Show message after delay
          failureTimeout = setTimeout(() => {
            setState((prev) => ({ ...prev, showMessage: true }));
          }, SHOW_RECOVERY_UI_DELAY);
        }
      }
    };

    // Initial check
    checkServerHealth();

    // Regular health checks
    statusCheckInterval = setInterval(checkServerHealth, STATUS_CHECK_INTERVAL);

    // If server is down, wait for recovery using the long-poll endpoint
    const waitForRecovery = async () => {
      if (!state.isDown) return;

      try {
        const response = await fetch(`${MONITOR_SERVER_URL}/api/monitor/wait-for-recovery`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(65000), // 65s timeout (server timeout is 60s)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'recovered') {
            console.log('[Dev Recovery] ✓ Recovery signal received! Reloading...');
            setState({ isDown: false, showMessage: false, recoveryProgress: 100 });
            setTimeout(() => window.location.reload(), 500);
            return;
          }
        }
      } catch (error) {
        // Long-poll timed out or failed, will retry with next interval
      }

      // Retry wait if still down
      if (state.isDown) {
        recoveryTimeout = setTimeout(waitForRecovery, 1000);
      }
    };

    if (state.isDown) {
      waitForRecovery();
    }

    return () => {
      clearTimeout(failureTimeout);
      clearTimeout(recoveryTimeout);
      clearInterval(statusCheckInterval);
      clearInterval(recoveryCheckInterval);
    };
  }, [state.isDown]);

  return state;
}

/**
 * DevServerRecoveryBanner Component
 * 
 * Displays a recovery message and progress indicator when the dev server is down.
 * Can be placed in the root layout.
 */
export function DevServerRecoveryBanner() {
  const recovery = useDevServerRecovery();

  if (!recovery.showMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md rounded-lg border border-amber-500 bg-amber-50 p-4 shadow-lg md:left-auto md:right-4 md:w-96">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500 animate-pulse" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">Dev Server Recovering</h3>
          <p className="text-sm text-amber-800 mt-1">
            The dev server crashed. Auto-recovery is in progress...
          </p>
          <div className="mt-3 h-1 w-full bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.min(recovery.recoveryProgress, 90)}%` }}
            />
          </div>
          <p className="text-xs text-amber-700 mt-2">
            Page will reload automatically when the server is back online.
          </p>
        </div>
      </div>
    </div>
  );
}
