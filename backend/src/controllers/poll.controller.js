const Poll = require('../models/Poll.model');
const Vote = require('../models/Vote.model');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateAccessTokens = (count) =>
  Array.from({ length: count }, () => ({
    token: crypto.randomBytes(16).toString('hex').toUpperCase(),
    isUsed: false,
  }));

const generateAccessCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ─── GET /api/polls (Host's polls) ───────────────────────────────────────────
const getMyPolls = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = { host: req.user._id };

    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [polls, total] = await Promise.all([
      Poll.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-accessTokens -invites -eligibility.invitedEmails'),
      Poll.countDocuments(query),
    ]);

    res.json({
      success: true,
      polls,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/polls/public ────────────────────────────────────────────────────
const getPublicPolls = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, sort = 'newest' } = req.query;
    const query = {
      status: 'active',
      accessType: 'public',
      isPublished: true,
    };

    if (category && category !== 'all') query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

    const sortOptions = {
      newest: { createdAt: -1 },
      popular: { 'stats.totalVotes': -1 },
      ending_soon: { endsAt: 1 },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [polls, total] = await Promise.all([
      Poll.find(query)
        .sort(sortOptions[sort] || { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('host', 'username displayName')
        .select('-accessTokens -invites -eligibility -settings'),
      Poll.countDocuments(query),
    ]);

    res.json({
      success: true,
      polls,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/polls ──────────────────────────────────────────────────────────
const createPoll = async (req, res, next) => {
  try {
    const {
      title,
      description,
      questions,
      accessType,
      eligibility,
      resultVisibility,
      settings,
      startsAt,
      endsAt,
      category,
      tags,
      status,
    } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title and at least one question are required.',
      });
    }

    const pollData = {
      title,
      description,
      questions,
      host: req.user._id,
      accessType: accessType || 'public',
      eligibility: eligibility || { type: accessType || 'public' },
      resultVisibility: resultVisibility || { mode: 'on_close' },
      settings: settings || {},
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      category: category || 'general',
      tags: tags || [],
      status: status || 'draft',
      isPublished: status === 'active',
    };

    // Generate access code for code-based polls
    if (accessType === 'code' && (!eligibility?.accessCode)) {
      pollData.eligibility.accessCode = generateAccessCode();
    }

    // Generate tokens for token-based polls
    if (accessType === 'token') {
      const tokenCount = eligibility?.tokenCount || 100;
      pollData.accessTokens = generateAccessTokens(tokenCount);
      pollData.eligibility.tokenCount = tokenCount;
    }

    // Set up invites for invite-based polls
    if (accessType === 'invite' && eligibility?.invitedEmails?.length > 0) {
      pollData.invites = eligibility.invitedEmails.map((email) => ({
        email,
        token: crypto.randomBytes(12).toString('hex'),
        status: 'pending',
      }));
    }

    const poll = await Poll.create(pollData);

    // Update host stats
    await poll.constructor.find(); // dummy
    const { User } = require('../models/User.model') || {};
    try {
      const UserModel = require('../models/User.model');
      await UserModel.findByIdAndUpdate(req.user._id, { $inc: { pollsCreated: 1 } });
    } catch (_) {}

    res.status(201).json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/polls/:identifier ───────────────────────────────────────────────
const getPoll = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Support lookup by MongoDB _id, slug, or shortId
    const orConditions = [
      { slug: identifier },
      { shortId: identifier.toUpperCase() },
    ];
    if (/^[a-f\d]{24}$/i.test(identifier)) {
      orConditions.push({ _id: identifier });
    }

    const poll = await Poll.findOne({ $or: orConditions }).populate('host', 'username displayName');

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }

    const isHost = req.user && poll.host._id.toString() === req.user._id.toString();

    // Build safe response based on role
    const pollObj = poll.toObject({ virtuals: true });

    if (!isHost) {
      delete pollObj.accessTokens;
      delete pollObj.eligibility.accessCode;
      delete pollObj.invites;

      // Hide results if not permitted
      if (!shouldShowResults(poll, false)) {
        pollObj.questions = pollObj.questions.map((q) => ({
          ...q,
          options: q.options.map((o) => ({ ...o, voteCount: undefined })),
        }));
        pollObj.stats = { totalVotes: poll.stats.totalVotes };
      }
    }

    res.json({ success: true, poll: pollObj, isHost });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/polls/:identifier/access ───────────────────────────────────────
// Validate access before showing poll voting UI
const validateAccess = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { token, code, email } = req.query;

    const poll = await Poll.findOne({
      $or: [{ slug: identifier }, { shortId: identifier.toUpperCase() }],
    });

    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found.' });
    if (!poll.isLive) {
      return res.status(403).json({
        success: false,
        message: poll.status === 'closed' ? 'This poll has closed.' : 'This poll is not currently active.',
      });
    }

    const { accessType, eligibility } = poll;
    let accessGranted = false;
    let voterToken = null;

    switch (accessType) {
      case 'public':
      case 'account':
        accessGranted = true;
        break;

      case 'code':
        if (code && eligibility.accessCode === code.toUpperCase()) {
          accessGranted = true;
        }
        break;

      case 'token':
        if (token) {
          const found = poll.accessTokens.find(
            (t) => t.token === token.toUpperCase() && !t.isUsed
          );
          if (found) {
            accessGranted = true;
            voterToken = found.token;
          }
        }
        break;

      case 'invite':
      case 'link':
        if (token) {
          const invite = poll.invites.find((i) => i.token === token && i.votedAt === null);
          if (invite) {
            accessGranted = true;
            voterToken = invite.token;
            // Mark invite as opened
            invite.openedAt = invite.openedAt || new Date();
            invite.status = 'opened';
            await poll.save();
          }
        }
        break;

      default:
        accessGranted = false;
    }

    if (!accessGranted) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid or missing credentials.',
      });
    }

    // Check if user already voted
    const voterQuery = buildVoterQuery(req, poll, voterToken);
    const existingVote = await Vote.findOne({ poll: poll._id, ...voterQuery });

    res.json({
      success: true,
      accessGranted: true,
      alreadyVoted: !!existingVote,
      voterToken,
      pollId: poll._id,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/polls/:id ─────────────────────────────────────────────────────
const updatePoll = async (req, res, next) => {
  try {
    const poll = req.poll;
    const allowed = ['title', 'description', 'tags', 'category', 'settings', 'resultVisibility', 'startsAt', 'endsAt', 'coverImage'];
    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Allow question edits only on non-active polls
    if (req.body.questions !== undefined) {
      if (poll.status === 'active' || poll.status === 'paused') {
        return res.status(400).json({
          success: false,
          message: 'Questions cannot be edited while a poll is active.',
        });
      }
      updates.questions = req.body.questions;
    }

    // Handle status transitions
    if (req.body.status) {
      const validTransitions = {
        draft: ['scheduled', 'active'],
        scheduled: ['active', 'draft'],
        active: ['paused', 'closed'],
        paused: ['active', 'closed'],
        closed: ['archived'],
      };
      const current = poll.status;
      const next_ = req.body.status;
      if (validTransitions[current]?.includes(next_)) {
        updates.status = next_;
        if (next_ === 'active') updates.isPublished = true;
      } else {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from '${current}' to '${next_}'.`,
        });
      }
    }

    Object.assign(poll, updates);
    await poll.save();

    res.json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/polls/:id ────────────────────────────────────────────────────
const deletePoll = async (req, res, next) => {
  try {
    const poll = req.poll;
    if (poll.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active poll. Close it first.',
      });
    }
    await Vote.deleteMany({ poll: poll._id });
    await poll.deleteOne();
    res.json({ success: true, message: 'Poll and all associated votes deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/polls/:id/publish ─────────────────────────────────────────────
const publishPoll = async (req, res, next) => {
  try {
    const poll = req.poll;
    if (poll.status !== 'draft' && poll.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Only draft or scheduled polls can be published.' });
    }
    poll.status = 'active';
    poll.isPublished = true;
    poll.startsAt = poll.startsAt || new Date();
    await poll.save();
    res.json({ success: true, poll, message: 'Poll is now live!' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/polls/:id/close ────────────────────────────────────────────────
const closePoll = async (req, res, next) => {
  try {
    const poll = req.poll;
    poll.status = 'closed';
    poll.endsAt = new Date();
    await poll.save();
    res.json({ success: true, poll, message: 'Poll closed.' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/polls/:id/release-results ─────────────────────────────────────
const releaseResults = async (req, res, next) => {
  try {
    const poll = req.poll;
    poll.resultVisibility.released = true;
    poll.resultVisibility.releasedAt = new Date();
    await poll.save();
    res.json({ success: true, message: 'Results released to voters.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/polls/:id/tokens ────────────────────────────────────────────────
const getAccessTokens = async (req, res, next) => {
  try {
    const poll = req.poll;
    if (poll.accessType !== 'token') {
      return res.status(400).json({ success: false, message: 'This poll does not use token access.' });
    }
    res.json({
      success: true,
      tokens: poll.accessTokens,
      stats: {
        total: poll.accessTokens.length,
        used: poll.accessTokens.filter((t) => t.isUsed).length,
        available: poll.accessTokens.filter((t) => !t.isUsed).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/polls/:id/generate-tokens ─────────────────────────────────────
const generateMoreTokens = async (req, res, next) => {
  try {
    const poll = req.poll;
    const { count = 10 } = req.body;
    if (count > 1000) return res.status(400).json({ success: false, message: 'Max 1000 tokens at a time.' });

    const newTokens = generateAccessTokens(count);
    poll.accessTokens.push(...newTokens);
    await poll.save();

    res.json({ success: true, newTokens, message: `${count} new tokens generated.` });
  } catch (error) {
    next(error);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shouldShowResults = (poll, isHost) => {
  if (isHost) return true;
  const { mode, released } = poll.resultVisibility;
  if (mode === 'hidden') return false;
  if (mode === 'real_time') return true;
  if (mode === 'on_close') return poll.status === 'closed';
  if (mode === 'host_release') return released;
  if (mode === 'delayed') {
    const delay = poll.resultVisibility.showAfterMinutes || 0;
    return new Date() > new Date(poll.stats.lastVoteAt?.getTime() + delay * 60000);
  }
  return false;
};

const buildVoterQuery = (req, poll, voterToken) => {
  const q = {};
  if (req.user) q['voter.userId'] = req.user._id;
  else if (voterToken) q['voter.accessToken'] = voterToken;
  return q;
};

module.exports = {
  getMyPolls,
  getPublicPolls,
  createPoll,
  getPoll,
  validateAccess,
  updatePoll,
  deletePoll,
  publishPoll,
  closePoll,
  releaseResults,
  getAccessTokens,
  generateMoreTokens,
};