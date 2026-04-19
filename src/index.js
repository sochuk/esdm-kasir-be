import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import categoryRoutes from './routes/category.routes.js';
import posRoutes from './routes/pos.routes.js';
import adminRoutes from './routes/admin.routes.js';
import memberRoutes from './routes/member.routes.js';
import reportRoutes from './routes/report.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for Base64 photo uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Default Ping Route
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Koperasi Konsumen Pegawai KESDM Backend is running 🚀' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/report', reportRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Server listening at http://localhost:${PORT}`);
});
