import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { initSocket } from './config/socket';
import { initFirebase } from './config/firebase';
import reportRoutes from './routes/reportRoutes';
import authRoutes from './routes/authRoutes';


const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const app: Application = express();
const httpServer = createServer(app);

// Inisialisasi Socket.io real-time engine
initSocket(httpServer);

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Rute utama API
app.use('/api/auth', authRoutes);
app.use('/api', reportRoutes);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', service: 'EcoWarn API', timestamp: new Date() });
});

// Inisialisasi Server & Database
const startServer = async (): Promise<void> => {
  try {
    // Inisialisasi Firebase Admin SDK untuk push notification FCM
    initFirebase();

    await connectDatabase();
    httpServer.listen(PORT, () => {
      console.log(`[Server] Peladen EcoWarn berjalan di port ${PORT} (HTTP & WebSockets)`);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Server] Gagal memulai peladen Express: ${errorMessage}`);
    process.exit(1);
  }
};

startServer();
