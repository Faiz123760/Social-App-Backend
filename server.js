const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();

// ========== CORS CONFIGURATION ==========
// Allow all origins temporarily (for testing)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ========== ROUTES ==========
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// ========== 404 HANDLER - NO '*' PATTERN ==========
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    success: false
  });
});

// ========== DATABASE CONNECTION ==========
const PORT = process.env.PORT || 5000;

// Connect to MongoDB if URI exists
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.log('⚠️ MongoDB connection error:', err.message));
} else {
  console.log('⚠️ No MONGODB_URI found. Running without database');
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Base URL: http://localhost:${PORT}\n`);
});
