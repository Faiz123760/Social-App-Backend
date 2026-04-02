const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();

// Configure Cloudinary (only if credentials exist)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// Define the missing function
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Create a post
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    // Check database connection
    if (!isDbConnected()) {
      return res.status(503).json({ 
        message: 'Database is not connected. Please check MongoDB connection.', 
        success: false 
      });
    }

    const { text } = req.body;
    
    // Validate text length
    if (text && text.length > 5000) {
      return res.status(400).json({ 
        message: 'Text is too long. Maximum 5000 characters allowed.', 
        success: false 
      });
    }
    
    let imageUrl = null;
    
    // Upload image to Cloudinary if exists
    if (req.file && cloudinary.config().cloud_name) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'social_posts' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }
    
    // Create post
    const post = new Post({
      userId: req.user.userId,
      username: req.user.username,
      text: text || '',
      imageUrl
    });
    
    await post.save();
    
    res.status(201).json({
      message: 'Post created successfully',
      success: true,
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: Object.values(error.errors).map(e => e.message).join(', '),
        success: false 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Server error', 
      success: false
    });
  }
});

// Get all posts (feed)
router.get('/', async (req, res) => {
  try {
    // Check database connection
    if (!isDbConnected()) {
      return res.status(503).json({ 
        message: 'Database is not connected. Please check MongoDB connection.', 
        success: false,
        posts: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalPosts: 0,
          hasMore: false
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Post.countDocuments();
    
    res.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error', 
      success: false 
    });
  }
});

// Like a post
router.post('/:postId/like', auth, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ 
        message: 'Database is not connected', 
        success: false 
      });
    }

    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }
    
    const alreadyLiked = post.likes.some(
      like => like.userId.toString() === req.user.userId
    );
    
    if (alreadyLiked) {
      post.likes = post.likes.filter(
        like => like.userId.toString() !== req.user.userId
      );
    } else {
      post.likes.push({
        userId: req.user.userId,
        username: req.user.username
      });
    }
    
    await post.save();
    
    res.json({
      success: true,
      likes: post.likes,
      liked: !alreadyLiked
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error', 
      success: false 
    });
  }
});

// Comment on a post
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ 
        message: 'Database is not connected', 
        success: false 
      });
    }

    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required', success: false });
    }
    
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }
    
    post.comments.push({
      userId: req.user.userId,
      username: req.user.username,
      text: text.trim()
    });
    
    await post.save();
    
    res.json({
      success: true,
      comment: post.comments[post.comments.length - 1]
    });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error', 
      success: false 
    });
  }
});

// Get single post
router.get('/:postId', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ 
        message: 'Database is not connected', 
        success: false 
      });
    }

    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error', 
      success: false 
    });
  }
});

module.exports = router;