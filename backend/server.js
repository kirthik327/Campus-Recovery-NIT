import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, db } from './database.js';

// Import Routes
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import claimRoutes from './routes/claims.js';
import notifRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // For local dev, allow any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploads folder as static files
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    database: db.getMode(),
    timestamp: new Date()
  });
});

// Root Redirect/Splash
app.get('/', (req, res) => {
  res.send('Campus Lost & Found Management API is Running.');
});

// Boot Server
async function startServer() {
  const MONGODB_URI = process.env.MONGODB_URI || '';
  await connectDB(MONGODB_URI);
  
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Server is running on: http://localhost:${PORT}`);
    console.log(`  Database mode       : ${db.getMode()}`);
    console.log(`=======================================================`);
  });
}

startServer();
