import { Server as HTTPServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer, Socket } from "socket.io";

let io: IOServer | null = null;

// Store active user connections
const userSockets: Map<string, Set<string>> = new Map();
const socketUsers: Map<string, string> = new Map();

export function initializeSocket(httpServer: HTTPServer) {
  if (io) return io;

  io = new IOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins their personal room
    socket.on("join-user", (userId: string) => {
      socket.join(`user:${userId}`);
      
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);
      socketUsers.set(socket.id, userId);
      
      console.log(`User ${userId} joined their room`);
    });

    // Join assignment room for real-time tracking
    socket.on("join-assignment", (assignmentId: string, userId: string) => {
      socket.join(`assignment:${assignmentId}`);
      console.log(`User ${userId} joined assignment ${assignmentId} room`);
    });

    // Listen for status updates from backend
    socket.on("disconnect", () => {
      const userId = socketUsers.get(socket.id);
      if (userId && userSockets.has(userId)) {
        userSockets.get(userId)!.delete(socket.id);
        if (userSockets.get(userId)!.size === 0) {
          userSockets.delete(userId);
        }
      }
      socketUsers.delete(socket.id);
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get Socket.io instance (for use in API routes)
 */
export function getSocket() {
  return io;
}

/**
 * Emit notification to user
 */
export function notifyUser(
  userId: string,
  event: string,
  data: any
) {
  if (!io) {
    console.warn("Socket.io not initialized");
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit assignment update to all users in the assignment room
 */
export function updateAssignment(
  assignmentId: string,
  data: any
) {
  if (!io) {
    console.warn("Socket.io not initialized");
    return;
  }

  io.to(`assignment:${assignmentId}`).emit("assignment-update", data);
}

/**
 * Broadcast to all connected users
 */
export function broadcast(event: string, data: any) {
  if (!io) {
    console.warn("Socket.io not initialized");
    return;
  }

  io.emit(event, data);
}

/**
 * Get list of connected users
 */
export function getConnectedUsers() {
  return Array.from(userSockets.keys());
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string) {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

/**
 * Emit notification and save to DB
 */
export async function emitNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    type: string;
  }
) {
  notifyUser(userId, "notification", notification);
}
