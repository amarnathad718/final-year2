"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseRealtimeOptions {
  userId?: string;
  assignmentId?: string;
  onUpdate?: (data: any) => void;
  onNotification?: (notification: any) => void;
  fallbackToPolling?: boolean;
}

/**
 * Hook for real-time WebSocket updates with fallback to polling
 * Automatically falls back to polling if WebSocket is unavailable (e.g., Vercel serverless)
 */
export function useRealtime(options: UseRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const isConnected = useRef(false);

  useEffect(() => {
    // Try to establish WebSocket connection
    try {
      socketRef.current = io(window.location.origin, {
        path: "/api/socket",
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect", () => {
        isConnected.current = true;
        console.log("WebSocket connected");

        // Join user room if userId provided
        if (options.userId) {
          socketRef.current?.emit("join-user", options.userId);
        }

        // Join assignment room if assignmentId provided
        if (options.assignmentId) {
          socketRef.current?.emit("join-assignment", options.assignmentId, options.userId);
        }
      });

      socketRef.current.on("disconnect", () => {
        isConnected.current = false;
        console.log("WebSocket disconnected, falling back to polling");
      });

      socketRef.current.on("assignment-update", (data) => {
        console.log("Received assignment update:", data);
        options.onUpdate?.(data);
      });

      socketRef.current.on("notification", (notification) => {
        console.log("Received notification:", notification);
        options.onNotification?.(notification);
      });
    } catch (error) {
      console.warn("WebSocket connection failed:", error);
      isConnected.current = false;
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [options.userId, options.assignmentId, options.onUpdate, options.onNotification]);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    isConnected: isConnected.current,
    emit,
    socket: socketRef.current,
  };
}
