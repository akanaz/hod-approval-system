// backend/src/server.ts
// ✅ UPDATED: Added delegation and dean routes

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import {connectDB} from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import requestRoutes from './routes/request.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import delegationRoutes from './routes/delegation.routes'; // ✅ NEW
import deanRoutes from './routes/dean.routes'; // ✅ NEW

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

dotenv.config();
console.log("Loaded JWT:", process.env.JWT_SECRET);


const app: Application = express();
const PORT = process.env.PORT || 5000;

// ✅ SECURITY: Validate JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is required in environment variables');
  process.exit(1);
}

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'MongoDB',
    version: '2.0.0' // ✅ Updated version
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', uploadRoutes);
app.use('/api/hod', delegationRoutes);           // ✅ FIX: Register HOD delegation routes
app.use('/api/dean', deanRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`💾 Database: MongoDB`);
  console.log(`✅ JWT Secret: Configured`);
  console.log(`📦 Version: 2.0.0`);
  console.log(`\n✨ NEW FEATURES:`);
  console.log(`   - Full-day leave support`);
  console.log(`   - HOD delegation system`);
  console.log(`   - Dean role for HOD approvals`);
  console.log(`   - Fixed file upload persistence`);
  console.log(`   - Enhanced security validation\n`);
});

export default app;
