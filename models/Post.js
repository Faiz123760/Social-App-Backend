const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000 // Keep this limit
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  text: {
    type: String,
    trim: true,
    maxlength: 5000 // Increased from 1000 to 5000
  },
  imageUrl: {
    type: String
  },
  likes: [likeSchema],
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1 });

module.exports = mongoose.model('Post', postSchema);