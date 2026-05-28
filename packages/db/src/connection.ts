import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB (uri: string): Promise<void> {
    if (isConnected) return;

    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
}

export async function disconnectDB (): Promise<void> {
    if (!isConnected) return;

    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ Disconnected from MongoDB');
}