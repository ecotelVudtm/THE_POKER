import mongoose from 'mongoose';

export async function connectDatabase(mongoUri?: string): Promise<boolean> {
  const uri = mongoUri?.trim();
  if (!uri) {
    console.log('[Database] MONGO_URI not set — running in In-Memory fallback mode.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Database] Connected to MongoDB successfully (collection: accounts).');
    return true;
  } catch (err) {
    console.warn(
      '[Database] Failed to connect to MongoDB, falling back to In-Memory mode:',
      (err as Error).message
    );
    return false;
  }
}
