import mongoose from 'mongoose';

const codeChunkSchema = new mongoose.Schema({
  repository: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  filePath: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  startLine: {
    type: Number,
    required: true
  },
  endLine: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    default: 'text'
  },
  embedding: {
    type: [Number],
    required: false
  }
});

const CodeChunk = mongoose.model('CodeChunk', codeChunkSchema);
export default CodeChunk;
