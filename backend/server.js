import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import repoRoutes from './routes/repoRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

import Repository from './models/Repository.js';
import { initCache } from './services/cacheService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Expand payload limits for large repo trees
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/repomind';
mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await initCache();
    try {
      const result = await Repository.updateMany(
        { status: { $in: ['pending', 'cloning', 'parsing', 'indexing'] } },
        { status: 'failed', error: 'Analysis was interrupted because the server restarted.' }
      );
      if (result.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${result.modifiedCount} stuck repository analysis records.`);
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up stuck repositories:', cleanupErr.message);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Ensure MongoDB is installed and running locally, or configure MONGO_URI in .env');
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/chats', chatRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`RepoMind AI Server is running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`👉 A stray process (likely another node server instance) is already running on this port.`);
    console.error(`👉 You can find the process ID by running: lsof -i :${PORT}`);
    console.error(`👉 You can kill it by running: kill -9 <PID> (or 'npx kill-port ${PORT}')\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

