const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionType: { type: String, required: true },

  // For single/multiple choice: array of selected option IDs
  selectedOptions: [{ type: String }],

  // For ranked choice: array of option IDs in ranked order
  rankedOptions: [{ type: String }],

  // For rating: numeric value
  rating: { type: Number, default: null },

  // For open text: text response
  textResponse: { type: String, trim: true, maxlength: 5000, default: null },

  // For yes/no: boolean
  booleanResponse: { type: Boolean, default: null },
});

const voteSchema = new mongoose.Schema(
  {
    // Unique vote identifier
    voteId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },

    // Poll reference
    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
    },

    // Voter identity (flexible - depends on access type)
    voter: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      email: { type: String, lowercase: true, default: null },
      accessToken: { type: String, default: null },   // token used to access poll
      sessionId: { type: String, default: null },     // anonymous session
      ipHash: { type: String, default: null },        // hashed IP for dedup (not stored raw)
      userAgent: { type: String, default: null },
    },

    // Eligibility proof
    eligibilityProof: {
      type: { type: String }, // which eligibility type was used
      verifiedAt: { type: Date },
      token: { type: String, default: null },
    },

    // Answers
    answers: [answerSchema],

    // Status
    status: {
      type: String,
      enum: ['submitted', 'changed', 'invalidated'],
      default: 'submitted',
    },

    // Metadata
    submittedAt: { type: Date, default: Date.now },
    changedAt: { type: Date, default: null },
    ipCountry: { type: String, default: null },
    completionTimeSeconds: { type: Number, default: null },

    isAnonymous: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
voteSchema.index({ poll: 1, 'voter.userId': 1 });
voteSchema.index({ poll: 1, 'voter.email': 1 });
voteSchema.index({ poll: 1, 'voter.accessToken': 1 });
voteSchema.index({ poll: 1, 'voter.ipHash': 1 });
voteSchema.index({ poll: 1, 'voter.sessionId': 1 });
voteSchema.index({ voteId: 1 });
voteSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);
