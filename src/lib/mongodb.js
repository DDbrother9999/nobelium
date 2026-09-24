import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI, PROD_MONGODB_URI, or DEV_MONGODB_URI environment variable inside .env.dev");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}

export default dbConnect;
