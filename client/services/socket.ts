import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        const token = localStorage.getItem('skyhigh_token');
        socket = io(SOCKET_URL || undefined, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000
        });
    }
    return socket;
}

/** Call this on logout to cleanly disconnect and reset the singleton */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/** Reconnect with a new token after login */
export function reconnectSocket() {
    disconnectSocket();
    return getSocket();
}
