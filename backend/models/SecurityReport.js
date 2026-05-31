import mongoose from 'mongoose';

const securityReportSchema = new mongoose.Schema({
  repoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  findings: [{
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true
    },
    type: {
      type: String, // e.g. "secretLeak", "cveVulnerability", "codeAntiPattern"
      required: true
    },
    file: {
      type: String,
      required: true
    },
    suggestion: {
      type: String,
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SecurityReport = mongoose.model('SecurityReport', securityReportSchema);
export default SecurityReport;
