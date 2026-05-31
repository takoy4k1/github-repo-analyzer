import mongoose from 'mongoose';
import crypto from 'crypto';

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'repomind_encryption_key_default_32_bytes';
  return crypto.createHash('sha256').update(key).digest();
};

const userSchema = new mongoose.Schema({
  githubId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String
  },
  avatarUrl: {
    type: String
  },
  accessToken: {
    type: String,
    required: false
  },
  refreshToken: {
    type: String
  },
  settings: {
    stalenessThreshold: {
      type: Number,
      default: 90 // default 90 days
    },
    alertThreshold: {
      type: Number,
      default: 80 // default 80%
    },
    watchedRepos: [{
      type: String // List of repo fullNames
    }],
    enabledChecks: [{
      type: String,
      default: ['testFileRatio', 'commitFrequency', 'openIssues', 'prMergeRate', 'averagePrAge']
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encryption methods for accessToken
userSchema.methods.encryptToken = function(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  this.accessToken = iv.toString('hex') + ':' + encrypted;
};

userSchema.methods.decryptToken = function() {
  if (!this.accessToken) return '';
  const parts = this.accessToken.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Hashing method for refreshToken
userSchema.methods.hashRefreshToken = function(token) {
  this.refreshToken = crypto.createHash('sha256').update(token).digest('hex');
};

userSchema.methods.compareRefreshToken = function(token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return this.refreshToken === hash;
};

const User = mongoose.model('User', userSchema);
export default User;
