import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import reportRoutes from './routes/reportRoutes';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rute utama API
app.use('/api', reportRoutes);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', service: 'EcoWarn API', timestamp: new Date() });
});

// Inisialisasi Server & Database
const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`[Server] Peladen EcoWarn berjalan di port ${PORT}`);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Server] Gagal memulai peladen Express: ${errorMessage}`);
    process.exit(1);
  }
};

startServer();
