const mongoose = require('mongoose');
require('dotenv').config();

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Delete all posts
    const db = mongoose.connection.db;
    const collection = db.collection('posts');
    
    const result = await collection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} posts`);
    
    // Also delete invalid comments/likes
    const usersCollection = db.collection('users');
    const usersResult = await usersCollection.updateMany(
      {},
      { $set: { posts: [], likes: [], comments: [] } }
    );
    
    console.log('Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
};

cleanup();