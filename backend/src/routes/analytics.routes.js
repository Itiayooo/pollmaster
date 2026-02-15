const express = require('express');
const router = express.Router();
const { protect, requirePollOwnership } = require('../middleware/auth.middleware');
const Poll = require('../models/Poll.model');
const { getDashboard, getPollAnalytics } = require('../controllers/analytics.controller');

const ownerMiddleware = requirePollOwnership(Poll);

router.get('/dashboard', protect, getDashboard);
router.get('/poll/:pollId', protect, ownerMiddleware, getPollAnalytics);

module.exports = router;
