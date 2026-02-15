const Poll = require('../models/Poll.model');
const Vote = require('../models/Vote.model');
const crypto = require('crypto');

// Hash IP for privacy-preserving deduplication
const hashIp = (ip) => crypto.createHash('sha256').update(ip + (process.env.JWT_SECRET || 'salt')).digest('hex');

// ─── POST /api/votes ──────────────────────────────────────────────────────────
const submitVote = async (req, res, next) => {
  try {
    const { pollId, pollSlug, answers, accessToken, accessCode, sessionId } = req.body;

    // Resolve poll
    const poll = await Poll.findOne({
      $or: [
        ...(pollId ? [{ _id: pollId }] : []),
        ...(pollSlug ? [{ slug: pollSlug }, { shortId: pollSlug.toUpperCase() }] : []),
      ],
    });

    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found.' });
    if (!poll.isLive) {
      return res.status(403).json({
        success: false,
        message: poll.status === 'closed' ? 'This poll has closed.' : 'Poll is not accepting votes.',
      });
    }

    // Eligibility validation
    const eligResult = await validateEligibility(req, poll, { accessToken, accessCode, sessionId });
    if (!eligResult.valid) {
      return res.status(403).json({ success: false, message: eligResult.reason });
    }

    // Deduplicate check
    const dupeCheck = await checkDuplicate(req, poll, eligResult);
    if (dupeCheck.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'You have already voted in this poll.',
        voteId: dupeCheck.voteId,
      });
    }

    // Validate answers against questions
    const validationError = validateAnswers(poll.questions, answers);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Build voter identity
    const voterData = buildVoterData(req, eligResult);

    // Create vote
    const vote = await Vote.create({
      poll: poll._id,
      voter: voterData,
      eligibilityProof: {
        type: poll.accessType,
        verifiedAt: new Date(),
        token: eligResult.token || null,
      },
      answers: answers.map((a) => ({
        questionId: a.questionId,
        questionType: a.questionType,
        selectedOptions: a.selectedOptions || [],
        rankedOptions: a.rankedOptions || [],
        rating: a.rating ?? null,
        textResponse: a.textResponse || null,
        booleanResponse: a.booleanResponse ?? null,
      })),
      isAnonymous: !req.user || poll.settings.allowAnonymous !== false,
      completionTimeSeconds: req.body.completionTimeSeconds || null,
    });

    // Update poll stats + option vote counts atomically
    await updatePollStats(poll, answers);

    // Mark token as used if applicable
    if (eligResult.token && poll.accessType === 'token') {
      await Poll.updateOne(
        { _id: poll._id, 'accessTokens.token': eligResult.token },
        {
          $set: {
            'accessTokens.$.isUsed': true,
            'accessTokens.$.usedAt': new Date(),
            'accessTokens.$.usedBy': req.user?.email || voterData.sessionId,
          },
        }
      );
    }

    // Mark invite as voted
    if (eligResult.token && poll.accessType === 'invite') {
      await Poll.updateOne(
        { _id: poll._id, 'invites.token': eligResult.token },
        { $set: { 'invites.$.votedAt': new Date(), 'invites.$.status': 'voted' } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Vote submitted successfully!',
      voteId: vote.voteId,
      showResults: shouldShowResultsNow(poll),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/votes/poll/:pollId/results ──────────────────────────────────────
const getPollResults = async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const { token } = req.query;

    // Safely build $or — only include _id if it looks like a valid ObjectId
    const orConditions = [
      { slug: pollId },
      { shortId: pollId.toUpperCase() },
    ];
    if (/^[a-f\d]{24}$/i.test(pollId)) {
      orConditions.push({ _id: pollId });
    }

    const poll = await Poll.findOne({ $or: orConditions });

    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found.' });

    const isHost = req.user && poll.host.toString() === req.user._id.toString();

    if (!isHost && !shouldShowResultsNow(poll)) {
      return res.status(403).json({
        success: false,
        message: 'Results are not yet available for this poll.',
        resultMode: poll.resultVisibility.mode,
      });
    }

    // Aggregate results per question/option
    const results = await aggregateResults(poll);

    res.json({
      success: true,
      pollTitle: poll.title,
      status: poll.status,
      stats: poll.stats,
      questions: results,
      resultVisibility: poll.resultVisibility,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/votes/check/:pollSlug ───────────────────────────────────────────
const checkVoteStatus = async (req, res, next) => {
  try {
    const { pollSlug } = req.params;
    const { sessionId, token } = req.query;

    const orConds = [{ slug: pollSlug }, { shortId: pollSlug.toUpperCase() }];
    if (/^[a-f\d]{24}$/i.test(pollSlug)) orConds.push({ _id: pollSlug });
    const poll = await Poll.findOne({ $or: orConds });

    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found.' });

    const query = { poll: poll._id };
    if (req.user) query['voter.userId'] = req.user._id;
    else if (token) query['voter.accessToken'] = token;
    else if (sessionId) query['voter.sessionId'] = sessionId;
    else {
      return res.json({ success: true, hasVoted: false });
    }

    const vote = await Vote.findOne(query).select('voteId submittedAt');
    res.json({ success: true, hasVoted: !!vote, vote: vote || null });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/votes/poll/:pollId/export ───────────────────────────────────────
const exportVotes = async (req, res, next) => {
  try {
    const poll = req.poll; // set by requirePollOwnership middleware
    const votes = await Vote.find({ poll: poll._id, status: 'submitted' })
      .sort({ submittedAt: -1 })
      .select('-voter.ipHash -__v');

    res.json({
      success: true,
      pollTitle: poll.title,
      exportedAt: new Date().toISOString(),
      totalVotes: votes.length,
      votes,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function validateEligibility(req, poll, { accessToken, accessCode, sessionId }) {
  const { accessType, eligibility } = poll;

  switch (accessType) {
    case 'public':
      return { valid: true, token: null };

    case 'account':
      if (!req.user) return { valid: false, reason: 'You must be logged in to vote in this poll.' };
      return { valid: true, token: null };

    case 'code':
      if (!accessCode || eligibility.accessCode !== accessCode.toUpperCase()) {
        return { valid: false, reason: 'Invalid access code.' };
      }
      return { valid: true, token: accessCode };

    case 'token': {
      if (!accessToken) return { valid: false, reason: 'Access token required.' };
      const found = poll.accessTokens.find(
        (t) => t.token === accessToken.toUpperCase() && !t.isUsed
      );
      if (!found) return { valid: false, reason: 'Invalid or already-used token.' };
      return { valid: true, token: found.token };
    }

    case 'invite':
    case 'link': {
      if (!accessToken) return { valid: false, reason: 'Invite token required.' };
      const invite = poll.invites.find((i) => i.token === accessToken && !i.votedAt);
      if (!invite) return { valid: false, reason: 'Invalid or already-used invite.' };
      return { valid: true, token: invite.token, email: invite.email };
    }

    default:
      return { valid: false, reason: 'Unknown access type.' };
  }
}

async function checkDuplicate(req, poll, eligResult) {
  const query = { poll: poll._id, status: 'submitted' };

  if (req.user) {
    query['voter.userId'] = req.user._id;
  } else if (eligResult.token) {
    query['voter.accessToken'] = eligResult.token;
  } else if (poll.settings?.ipDeduplication) {
    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    query['voter.ipHash'] = hashIp(ip);
  } else {
    return { isDuplicate: false };
  }

  const existing = await Vote.findOne(query).select('voteId');
  return { isDuplicate: !!existing, voteId: existing?.voteId };
}

function buildVoterData(req, eligResult) {
  const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
  return {
    userId: req.user?._id || null,
    email: req.user?.email || eligResult.email || null,
    accessToken: eligResult.token || null,
    sessionId: req.body.sessionId || null,
    ipHash: hashIp(ip),
    userAgent: req.headers['user-agent']?.slice(0, 200) || null,
  };
}

function validateAnswers(questions, answers) {
  for (const question of questions) {
    if (!question.required) continue;
    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer) return `Answer required for question: "${question.text}"`;

    if (question.type === 'single_choice' && (!answer.selectedOptions || answer.selectedOptions.length !== 1)) {
      return `Question "${question.text}" requires exactly one selection.`;
    }
    if (question.type === 'multiple_choice' && (!answer.selectedOptions || answer.selectedOptions.length === 0)) {
      return `Question "${question.text}" requires at least one selection.`;
    }
    if (question.type === 'rating' && (answer.rating == null || answer.rating < 1)) {
      return `A rating is required for "${question.text}".`;
    }
  }
  return null;
}

async function updatePollStats(poll, answers) {
  const updates = {
    $inc: { 'stats.totalVotes': 1, 'stats.uniqueVoters': 1 },
    $set: { 'stats.lastVoteAt': new Date() },
  };

  await Poll.updateOne({ _id: poll._id }, updates);

  // Update option vote counts
  for (const answer of answers) {
    if (answer.selectedOptions?.length > 0) {
      for (const optionId of answer.selectedOptions) {
        await Poll.updateOne(
          { _id: poll._id, 'questions.id': answer.questionId, 'questions.options.id': optionId },
          { $inc: { 'questions.$[q].options.$[o].voteCount': 1 } },
          { arrayFilters: [{ 'q.id': answer.questionId }, { 'o.id': optionId }] }
        );
      }
    }
  }
}

async function aggregateResults(poll) {
  return poll.questions.map((question) => {
    const totalForQuestion = question.options.reduce((sum, o) => sum + o.voteCount, 0);
    return {
      id: question.id,
      text: question.text,
      type: question.type,
      totalResponses: totalForQuestion,
      options: question.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.voteCount,
        percentage: totalForQuestion > 0 ? Math.round((opt.voteCount / totalForQuestion) * 100) : 0,
      })),
    };
  });
}

function shouldShowResultsNow(poll) {
  const { mode, released } = poll.resultVisibility;
  if (mode === 'real_time') return true;
  if (mode === 'on_close' && poll.status === 'closed') return true;
  if (mode === 'host_release' && released) return true;
  return false;
}

module.exports = { submitVote, getPollResults, checkVoteStatus, exportVotes };