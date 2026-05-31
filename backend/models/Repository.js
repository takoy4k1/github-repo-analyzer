import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    index: true
  },
  ownerId: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    default: 'main'
  },
  status: {
    type: String,
    enum: ['pending', 'cloning', 'parsing', 'indexing', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String
  },
  fileTree: {
    type: Object, // Recursive representation of directories and files
    default: {}
  },
  summary: {
    overview: { type: String, default: '' },
    architecture: { type: String, default: '' },
    techStack: [String],
    modules: [{
      name: { type: String },
      purpose: { type: String }
    }],
    onboarding: { type: String, default: '' },
    scalability: { type: String, default: '' },
    codeQuality: { type: String, default: '' },
    improvements: { type: String, default: '' },
    diagram: { type: String, default: '' } // Mermaid syntax flowchart
  },
  metrics: {
    totalFiles: { type: Number, default: 0 },
    totalLines: { type: Number, default: 0 },
    languages: { type: Map, of: Number, default: {} },
    architectureScore: { type: Number, default: 80 },
    maintainabilityScore: { type: Number, default: 80 },
    onboardingDifficulty: { type: String, default: 'Medium' },
    estimatedComplexity: { type: String, default: 'Medium' },
    
    // Feature 1: Health Score Breakdown
    healthBreakdown: {
      openIssuesScore: Number,
      prMergeRateScore: Number,
      testFileRatioScore: Number,
      prAgeScore: Number,
      commitFreqScore: Number
    },
    
    // Feature 2: Contributor DNA & Bus Factor
    busFactorRisk: {
      riskFiles: [{
        file: String,
        topContributor: String,
        contributorCommits: Number,
        totalCommits: Number,
        percentage: Number,
        lastCommitDate: Date
      }],
      riskDirectories: {
        type: Map,
        of: Number, // directoryPath -> risk level (0 to 100)
        default: {}
      }
    },

    // Feature 3: Dev Velocity
    devVelocity: {
      averagePrMergeTimeHours: Number,
      reviewBottlenecksCount: Number,
      weeklyCommits: [Number]
    },

    // Feature 4: Dead Code
    deadCode: {
      staleFiles: [{
        file: String,
        lastTouchedDate: Date,
        sizeBytes: Number,
        primaryAuthor: String,
        daysStale: Number
      }]
    }
  },
  healthScore: {
    type: Number,
    default: 100
  },
  lastAnalysedAt: {
    type: Date,
    default: Date.now
  },
  snapshotHistory: [{
    timestamp: { type: Date, default: Date.now },
    score: Number,
    metrics: Object
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

repositorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastAnalysedAt = Date.now();
  next();
});

const Repository = mongoose.model('Repository', repositorySchema);
export default Repository;
