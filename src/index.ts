import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import attendanceRoutes from './routes/attendance.route.js';
import userRoutes from './routes/user.route.js';
import calendarRoutes from './routes/calendar.route.js';
import os from 'os';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

const uploadsPath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(uploadsPath));

// Health check endpoints
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// API Routes
app.use('/api', userRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', calendarRoutes);

const PORT = parseInt(process.env.PORT || '3000', 10);

function getLocalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
      console.error('Failed to connect to database:', dbConnection.message);
      process.exit(1);
    }
    console.log('✅ Database connected successfully');

    const localIP = getLocalIPv4();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📱 API available at http://${localIP}:${PORT}/api`);
      console.log(`📁 Uploads served from: ${uploadsPath}`);
      
      console.log('\n=== Available API Endpoints ===');
      console.log('\n🔐 Authentication:');
      console.log(`  POST http://${localIP}:${PORT}/api/login`);
      console.log(`  GET  http://${localIP}:${PORT}/api/user/:employeeNumber`);
      
      console.log('\n📅 Attendance:');
      console.log(`  POST http://${localIP}:${PORT}/api/attendance`);
      console.log(`  POST http://${localIP}:${PORT}/api/attendance/checkout`);
      console.log(`  GET  http://${localIP}:${PORT}/api/attendance/today/:username`);
      console.log(`  GET  http://${localIP}:${PORT}/api/attendance/calendar/:employeeNumber`);
      
      console.log('\n📆 Calendar:');
      console.log(`  GET  http://${localIP}:${PORT}/api/calendar`);
      console.log(`  GET  http://${localIP}:${PORT}/api/calendar/holidays`);
      console.log(`  GET  http://${localIP}:${PORT}/api/calendar/working-days`);
      console.log(`  POST http://${localIP}:${PORT}/api/calendar/holiday`);
      
      console.log('\n🔧 Admin:');
      console.log(`  GET  http://${localIP}:${PORT}/api/admin/users-attendance`);
      console.log('================================\n');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();