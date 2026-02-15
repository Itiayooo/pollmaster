const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ─── Question Sub-Schema ──────────────────────────────────────────────────────
const optionSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4() },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  description: { type: String, trim: true, maxlength: 1000, default: null },
  imageUrl: { type: String, default: null },
  voteCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
});

const questionSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4() },
  type: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'ranked_choice', 'rating', 'open_text', 'yes_no'],
    required: true,
  },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  description: { type: String, trim: true, maxlength: 2000, default: null },
  required: { type: Boolean, default: true },
  options: [optionSchema],
  settings: {
    maxChoices: { type: Number, default: null }, // for multiple_choice
    minChoices: { type: Number, default: null },
    maxRating: { type: Number, default: 5 },     // for rating
    allowAbstain: { type: Boolean, default: false },
  },
  order: { type: Number, default: 0 },
});

// ─── Eligibility Rules Sub-Schema ─────────────────────────────────────────────
const eligibilitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'public',          // Anyone can vote
      'token',           // Unique token per voter
      'invite',          // Email-based invites with tokens
      'code',            // Shared access code
      'account',         // Must have a PollMaster account
      'link',            // Tokenized URL access
    ],
    required: true,
    default: 'public',
  },
  // For 'code' type
  accessCode: { type: String, default: null },
  // For 'invite' type - list of invited emails
  invitedEmails: [{ type: String, lowercase: true, trim: true }],
  // For 'token' type - pre-generated tokens
  tokenCount: { type: Number, default: null },
  // For 'account' type
  requireVerifiedEmail: { type: Boolean, default: false },
  // General settings
  allowAnonymous: { type: Boolean, default: true },
  maxVoters: { type: Number, default: null }, // null = unlimited
});

// ─── Result Visibility Sub-Schema ─────────────────────────────────────────────
const resultVisibilitySchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: [
      'real_time',       // Voters see results immediately after voting
      'on_close',        // Results shown when poll closes
      'host_release',    // Host manually releases results
      'hidden',          // Results never shown to voters
      'delayed',         // Results shown after X minutes/hours
    ],
    default: 'on_close',
  },
  showAfterMinutes: { type: Number, default: null }, // for 'delayed'
  showVoterNames: { type: Boolean, default: false },
  showPercentages: { type: Boolean, default: true },
  showAbsoluteNumbers: { type: Boolean, default: true },
  released: { type: Boolean, default: false },      // for 'host_release'
  releasedAt: { type: Date, default: null },
});

// ─── Poll Settings Sub-Schema ─────────────────────────────────────────────────
const pollSettingsSchema = new mongoose.Schema({
  allowComments: { type: Boolean, default: false },
  allowVoteChange: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  showProgressBar: { type: Boolean, default: true },
  requireAllQuestions: { type: Boolean, default: true },
  sendEmailNotifications: { type: Boolean, default: true },
  captchaEnabled: { type: Boolean, default: false },
  ipDeduplication: { type: Boolean, default: true }, // prevent multiple from same IP
});

// ─── Poll Schema (Core) ───────────────────────────────────────────────────────
const pollSchema = new mongoose.Schema(
  {
    // Identity
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    shortId: {
      type: String,
      unique: true,
      uppercase: true,
    },

    // Host
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Content
    title: {
      type: String,
      required: [true, 'Poll title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    category: {
      type: String,
      enum: ['general', 'governance', 'community', 'event', 'competition', 'award', 'survey', 'dao', 'other'],
      default: 'general',
    },

    // Questions
    questions: [questionSchema],

    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'closed', 'archived'],
      default: 'draft',
    },

    // Timing
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    timezone: { type: String, default: 'UTC' },

    // Access Control
    accessType: {
      type: String,
      enum: ['public', 'token', 'invite', 'code', 'account', 'link'],
      default: 'public',
    },
    eligibility: eligibilitySchema,
    resultVisibility: resultVisibilitySchema,
    settings: pollSettingsSchema,

    // Stats (denormalized for performance)
    stats: {
      totalVotes: { type: Number, default: 0 },
      uniqueVoters: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      lastVoteAt: { type: Date, default: null },
    },

    // Tokens pool (for token-based access)
    accessTokens: [{
      token: { type: String },
      usedBy: { type: String, default: null }, // email or userId
      usedAt: { type: Date, default: null },
      isUsed: { type: Boolean, default: false },
    }],

    // Invite tracking
    invites: [{
      email: { type: String, lowercase: true },
      token: { type: String },
      sentAt: { type: Date, default: null },
      openedAt: { type: Date, default: null },
      votedAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['pending', 'sent', 'opened', 'voted', 'failed'],
        default: 'pending',
      },
    }],

    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    allowExport: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save: Generate shortId & slug ────────────────────────────────────────
pollSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Generate 8-char short ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let shortId = '';
    for (let i = 0; i < 8; i++) {
      shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.shortId = shortId;

    // Generate slug from title
    if (!this.slug) {
      const baseSlug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
      this.slug = `${baseSlug}-${shortId.toLowerCase()}`;
    }
  }
  next();
});

// ─── Virtual: isLive ──────────────────────────────────────────────────────────
pollSchema.virtual('isLive').get(function () {
  const now = new Date();
  return (
    this.status === 'active' &&
    (!this.startsAt || this.startsAt <= now) &&
    (!this.endsAt || this.endsAt >= now)
  );
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
pollSchema.index({ host: 1, status: 1 });
pollSchema.index({ slug: 1 });
pollSchema.index({ shortId: 1 });
pollSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
pollSchema.index({ tags: 1 });
pollSchema.index({ 'eligibility.invitedEmails': 1 });
pollSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Poll', pollSchema);
