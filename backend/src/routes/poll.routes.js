const express = require('express');
const router = express.Router();
const { protect, optionalAuth, requirePollOwnership } = require('../middleware/auth.middleware');
const Poll = require('../models/Poll.model');
const ctrl = require('../controllers/poll.controller');

const ownerMiddleware = requirePollOwnership(Poll);

// Public routes
router.get('/public', optionalAuth, ctrl.getPublicPolls);
router.get('/:identifier', optionalAuth, ctrl.getPoll);
router.get('/:identifier/access', optionalAuth, ctrl.validateAccess);

// Host routes (auth required)
router.get('/', protect, ctrl.getMyPolls);
router.post('/', protect, ctrl.createPoll);

// Poll-specific host routes
router.patch('/:pollId', protect, ownerMiddleware, ctrl.updatePoll);
router.delete('/:pollId', protect, ownerMiddleware, ctrl.deletePoll);
router.post('/:pollId/publish', protect, ownerMiddleware, ctrl.publishPoll);
router.post('/:pollId/close', protect, ownerMiddleware, ctrl.closePoll);
router.post('/:pollId/release-results', protect, ownerMiddleware, ctrl.releaseResults);
router.get('/:pollId/tokens', protect, ownerMiddleware, ctrl.getAccessTokens);
router.post('/:pollId/generate-tokens', protect, ownerMiddleware, ctrl.generateMoreTokens);

module.exports = router;
