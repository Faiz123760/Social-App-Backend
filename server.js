const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();

// CORS configuration - FIXED (remove the app.options line)
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware - this automatically handles OPTIONS
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'no origin'}`);
  next();
});

// ========== HEALTH CHECK ENDPOINT ==========
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// ========== TEST ENDPOINT ==========
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    success: true,
    endpoints: {
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      createPost: 'POST /api/posts',
      getFeed: 'GET /api/posts',
      likePost: 'POST /api/posts/:id/like',
      comment: 'POST /api/posts/:id/comment'
    }
  });
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
  res.json({
    name: 'Social Post API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      test: 'GET /api/test',
      auth: '/api/auth',
      posts: '/api/posts'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// 404 handler for undefined routes - MOVED TO END
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: {
      health: 'GET /health',
      test: 'GET /api/test',
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      createPost: 'POST /api/posts (requires auth)',
      getFeed: 'GET /api/posts',
      getSinglePost: 'GET /api/posts/:id',
      likePost: 'POST /api/posts/:id/like (requires auth)',
      comment: 'POST /api/posts/:id/comment (requires auth)'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    success: false
  });
});

// Connect to MongoDB with better error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.log('⚠️  No MONGODB_URI found. Running without database connection');
      return;
    }
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Server will continue running without database connection');
  }
};

// Call connect function
connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Accepting requests from:`, corsOptions.origin);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Base URL: http://localhost:${PORT}\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    if (mongoose.connection) {
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  // Serve frontend build files
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}