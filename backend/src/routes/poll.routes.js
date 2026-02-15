const express = require('express');
const router = express.Router();
const { protect, optionalAuth, requirePollOwnership } = require('../middleware/auth.middleware');
const Poll = require('../models/Poll.model');
const ctrl = require('../controllers/poll.controller');

const ownerMiddleware = requirePollOwnership(Poll);

// Exact routes MUST come before parameterised catch-alls
router.get('/', protect, ctrl.getMyPolls);
router.get('/public', optionalAuth, ctrl.getPublicPolls);

// Parameterised routes
router.get('/:identifier/access', optionalAuth, ctrl.validateAccess);
router.get('/:identifier', optionalAuth, ctrl.getPoll);

// Create
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