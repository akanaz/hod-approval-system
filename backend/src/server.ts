// backend/src/server.ts
// CORS FIXED FOR VERCEL + RENDER DEPLOYMENT

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import routes
import authRoutes from './routes/auth.routes';
import requestRoutes from './routes/request.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import dashboardRoutes from './routes/dashboard.routes';
import notificationRoutes from './routes/notification.routes';
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS CONFIGURATION ───────────────────────────────────────
// Supports: localhost dev + Vercel production + Vercel preview URLs

const getAllowedOrigins = (): string[] => {
  const origins: string[] = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
  ];

  // Add production Vercel URL from env
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
    // Also add without trailing slash just in case
    origins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  return origins;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Exact match
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow ALL vercel.app preview deployments for your project
    // e.g. hod-approval-system-git-main-username.vercel.app
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow localhost on any port (for development)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Block everything else
    console.warn('⚠️  CORS blocked origin:', origin);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Important for IE11 / some preflight requests
};

// ─── MIDDLEWARE ───────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// IMPORTANT: CORS must come BEFORE all routes
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for ALL routes
app.options('*', cors(corsOptions));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve static files (uploaded documents)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── ROUTES ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/files', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
  });
});

// ─── ERROR HANDLING ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── START SERVER ─────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('🚀 Server running on port', PORT);
      console.log('📝 Environment:', process.env.NODE_ENV);
      console.log('🌐 CORS allowed for:', getAllowedOrigins().join(', '));
      console.log('🌐 Also allowed: *.vercel.app (all preview deployments)');
      console.log('💾 Database: MongoDB');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
