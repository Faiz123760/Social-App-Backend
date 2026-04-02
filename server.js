const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// ========== TEST ROUTES ==========
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

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

// ========== API ROUTES ==========
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// ========== 404 HANDLER - MUST BE LAST ==========
// Remove any app.get('*') and use this instead
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

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    success: false
  });
});

// ========== DATABASE CONNECTION ==========
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
    } else {
      console.log('⚠️  No MONGODB_URI found. Running without database');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Server will continue without database connection');
  }
};

connectDB();

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Base URL: http://localhost:${PORT}\n`);
});
