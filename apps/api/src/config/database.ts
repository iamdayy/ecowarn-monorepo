import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecowarn_db';

export const connectDatabase = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(MONGO_URI);
    console.log(`[Database] MongoDB terhubung: ${connection.connection.host}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Database] Gagal menghubungkan ke kluster MongoDB (${MONGO_URI}): ${errorMessage}`);
    process.exit(1);
  }
};
