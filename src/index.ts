import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import attendanceRoutes from './routes/attendance.route.js';
import userRoutes from './routes/user.route.js';
import userIITRoutes from './routes/user.iit.route.js';
import userLocationRoutes from './routes/userLocation.route.js';
import profileRoutes from './routes/profile.route.js';
import { FieldTripScheduler } from './services/fieldTripSchedular.js';
import os from 'os';
import testRoute from './routes/test.route.js';

dotenv.config();
connectDB();

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

// Your existing routes (for testing)
app.use('/api', attendanceRoutes);
app.use('/api', userRoutes);           // Your original login/signup
app.use('/api', userIITRoutes);        // New IIT-integrated routes
app.use('/api', userLocationRoutes);
app.use('/api', profileRoutes);
app.use('/api', testRoute)

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

const localIP = getLocalIPv4();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`API available at http://${localIP}:${PORT}/api`);
  console.log(`Uploads served from: ${uploadsPath}`);
  
  console.log('\n=== Available Authentication Endpoints ===');
  console.log('Testing (Your Original):');
  console.log(`  POST http://${localIP}:${PORT}/api/signup`);
  console.log(`  POST http://${localIP}:${PORT}/api/login`);
  console.log('\nProduction (IIT-Integrated):');
  console.log(`  POST http://${localIP}:${PORT}/api/iit/login`);
  console.log(`  GET  http://${localIP}:${PORT}/api/iit/test-connection`);
  console.log('=========================================\n');
  
  // Start the field trip scheduler
  const scheduler = FieldTripScheduler.getInstance();
  scheduler.startScheduler();
  console.log('Field trip scheduler started');
});