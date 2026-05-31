import mongoose from 'mongoose';

const prReviewSchema = new mongoose.Schema({
  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  prNumber: {
    type: Number,
    required: true
  },
  aiSummary: {
    type: String,
    required: true
  },
  flaggedIssues: [{
    type: { type: String }, // e.g. "missingTest", "largeDiff", "dependencyBump"
    file: { type: String },
    message: { type: String },
    severity: { type: String, enum: ['warning', 'info', 'critical'], default: 'warning' }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PRReview = mongoose.model('PRReview', prReviewSchema);
export default PRReview;
