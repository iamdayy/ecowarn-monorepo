import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
let socketServer: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  try {
    socketServer = new SocketIOServer(httpServer, {
      cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
      },
    });

    socketServer.on('connection', (socket: Socket) => {
      console.log(`[Socket.io] Klien terhubung: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[Socket.io] Klien terputus: ${socket.id}`);
      });
    });

    console.log('[Socket.io] Peladen real-time berhasil diinisialisasi');
    return socketServer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Socket.io] Gagal menginisialisasi Socket.io: ${errorMessage}`);
    throw new Error(`Gagal menginisialisasi Socket.io: ${errorMessage}`);
  }
};

export const getSocketServer = (): SocketIOServer => {
  if (!socketServer) {
    throw new Error('Peladen Socket.io belum diinisialisasi!');
  }
  return socketServer;
};
