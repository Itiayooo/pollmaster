const express = require('express');
const router = express.Router();
const { protect, optionalAuth, requirePollOwnership } = require('../middleware/auth.middleware');
const Poll = require('../models/Poll.model');
const { submitVote, getPollResults, checkVoteStatus, exportVotes } = require('../controllers/vote.controller');

const ownerMiddleware = requirePollOwnership(Poll);

router.post('/', optionalAuth, submitVote);
router.get('/poll/:pollId/results', optionalAuth, getPollResults);
router.get('/check/:pollSlug', optionalAuth, checkVoteStatus);
router.get('/poll/:pollId/export', protect, ownerMiddleware, exportVotes);

module.exports = router;
