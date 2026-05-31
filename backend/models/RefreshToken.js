import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Document auto-expires from MongoDB once expiresAt time is reached
  },
  used: {
    type: Boolean,
    default: false
  }
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
