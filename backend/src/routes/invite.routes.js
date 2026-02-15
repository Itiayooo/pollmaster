const express = require('express');
const router = express.Router();
const { protect, requirePollOwnership } = require('../middleware/auth.middleware');
const Poll = require('../models/Poll.model');
const { sendInvites, addInvitees, getInviteList } = require('../controllers/invite.controller');

const ownerMiddleware = requirePollOwnership(Poll);

router.get('/:pollId', protect, ownerMiddleware, getInviteList);
router.post('/:pollId/send', protect, ownerMiddleware, sendInvites);
router.post('/:pollId/add', protect, ownerMiddleware, addInvitees);

module.exports = router;
