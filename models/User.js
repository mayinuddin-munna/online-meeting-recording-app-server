const { MongoClient, ObjectId } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'meetingapp';

// Create a MongoDB client
const client = new MongoClient(url, { useUnifiedTopology: true });

// Connect to MongoDB
async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// Define the User model
const User = {
  collection: client.db(dbName).collection('users'),

  // Create a new user
  async create(username, password) {
    try {
      const result = await this.collection.insertOne({ username, password, raisedHand: false });
      return result.insertedId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Find a user by username
  async findByUsername(username) {
    try {
      return await this.collection.findOne({ username });
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  },

  // Find a user by ID
  async findById(id) {
    try {
      return await this.collection.findOne({ _id: ObjectId(id) });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  },

  // Update a user's raised hand status
  async updateRaisedHandStatus(id, raisedHand) {
    try {
      await this.collection.updateOne(
        { _id: ObjectId(id) },
        { $set: { raisedHand } }
      );
    } catch (error) {
      console.error('Error updating raised hand status:', error);
      throw error;
    }
  },
};

// Export the User model
module.exports = User;

// Connect to MongoDB on application startup
connectToMongo();
