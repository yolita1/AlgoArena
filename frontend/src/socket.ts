/**
 * socket.ts — Socket.io singleton
 *
 * CRITICAL: The socket instance is NEVER destroyed.
 * Listeners are attached once in App.tsx and persist for the whole session.
 * On leave/play-again we just disconnect() + reconnect() without nulling the instance.
 */
import { io, Socket } from 'socket.io-client';

const BACKEND_URL: string = (() => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL as string;
  if (import.meta.env.DEV) return 'http://localhost:3001';
  return window.location.origin;
})();

// Create exactly ONE socket for the lifetime of the page.
export const socket: Socket = io(BACKEND_URL, {
  autoConnect:          false,
  reconnection:         true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:    1000,
  reconnectionDelayMax: 5000,
  transports:  ['polling', 'websocket'],
  upgrade:     true,
  timeout:     20000,
  withCredentials: true,
});

socket.on('connect_error', (err) => {
  console.warn('[socket] connect_error:', err.message);
});

/** Connect with optional JWT token */
export function connectSocket(token?: string | null): void {
  socket.auth = { token: token ?? null };
  if (!socket.connected) socket.connect();
}

/**
 * "Leave" — disconnect cleanly but DO NOT destroy the socket.
 * Listeners survive; next connectSocket() reuses the same instance.
 */
export function disconnectSocket(): void {
  socket.disconnect();
  // socket instance stays alive — listeners remain attached
}
