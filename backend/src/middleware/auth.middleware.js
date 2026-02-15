const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// ─── Require Authentication ───────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    next(error);
  }
};

// ─── Optional Authentication (for public polls) ───────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

// ─── Admin Only ───────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }
  next();
};

// ─── Require Poll Ownership ───────────────────────────────────────────────────
const requirePollOwnership = (Poll) => async (req, res, next) => {
  try {
    const poll = await Poll.findOne({
      $or: [
        { _id: req.params.pollId },
        { slug: req.params.slug },
        { shortId: req.params.shortId },
      ],
    });

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }

    if (req.user.role !== 'admin' && poll.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this poll.',
      });
    }

    req.poll = poll;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, optionalAuth, adminOnly, requirePollOwnership };
