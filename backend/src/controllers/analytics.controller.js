const Poll = require('../models/Poll.model');
const Vote = require('../models/Vote.model');

// ─── GET /api/analytics/dashboard ────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const hostId = req.user._id;

    const [totalPolls, activePolls, closedPolls, pollsWithVotes] = await Promise.all([
      Poll.countDocuments({ host: hostId }),
      Poll.countDocuments({ host: hostId, status: 'active' }),
      Poll.countDocuments({ host: hostId, status: 'closed' }),
      Poll.find({ host: hostId }).select('stats title status createdAt slug shortId'),
    ]);

    const totalVotes = pollsWithVotes.reduce((sum, p) => sum + (p.stats?.totalVotes || 0), 0);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPolls = await Poll.find({
      host: hostId,
      createdAt: { $gte: sevenDaysAgo },
    }).countDocuments();

    // Top performing polls
    const topPolls = pollsWithVotes
      .sort((a, b) => (b.stats?.totalVotes || 0) - (a.stats?.totalVotes || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p._id,
        title: p.title,
        status: p.status,
        totalVotes: p.stats?.totalVotes || 0,
        slug: p.slug,
        shortId: p.shortId,
        createdAt: p.createdAt,
      }));

    res.json({
      success: true,
      overview: {
        totalPolls,
        activePolls,
        closedPolls,
        draftPolls: totalPolls - activePolls - closedPolls,
        totalVotes,
        recentPolls,
      },
      topPolls,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/poll/:pollId ─────────────────────────────────────────
const getPollAnalytics = async (req, res, next) => {
  try {
    const poll = req.poll;

    // Vote timeline (grouped by day)
    const votes = await Vote.find({ poll: poll._id, status: 'submitted' })
      .sort({ submittedAt: 1 })
      .select('submittedAt completionTimeSeconds voter.ipHash');

    // Build timeline
    const timelineMap = {};
    votes.forEach((vote) => {
      const day = vote.submittedAt.toISOString().slice(0, 10);
      timelineMap[day] = (timelineMap[day] || 0) + 1;
    });

    const timeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

    // Average completion time
    const completionTimes = votes
      .filter((v) => v.completionTimeSeconds)
      .map((v) => v.completionTimeSeconds);
    const avgCompletionTime = completionTimes.length
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : null;

    // Peak hour analysis
    const hourMap = {};
    votes.forEach((vote) => {
      const hour = vote.submittedAt.getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];

    // Question response rates
    const questionStats = poll.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      totalResponses: q.options.reduce((s, o) => s + o.voteCount, 0),
      options: q.options.map((o) => ({
        text: o.text,
        voteCount: o.voteCount,
        percentage: poll.stats.totalVotes > 0
          ? Math.round((o.voteCount / poll.stats.totalVotes) * 100)
          : 0,
      })),
    }));

    // Invite stats if applicable
    let inviteStats = null;
    if (poll.accessType === 'invite') {
      const total = poll.invites.length;
      const voted = poll.invites.filter((i) => i.votedAt).length;
      const opened = poll.invites.filter((i) => i.openedAt).length;
      inviteStats = {
        total,
        sent: poll.invites.filter((i) => i.sentAt).length,
        opened,
        voted,
        openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
        voteRate: total > 0 ? Math.round((voted / total) * 100) : 0,
      };
    }

    // Token stats
    let tokenStats = null;
    if (poll.accessType === 'token') {
      const total = poll.accessTokens.length;
      const used = poll.accessTokens.filter((t) => t.isUsed).length;
      tokenStats = { total, used, available: total - used, usageRate: total > 0 ? Math.round((used / total) * 100) : 0 };
    }

    res.json({
      success: true,
      poll: {
        id: poll._id,
        title: poll.title,
        status: poll.status,
        stats: poll.stats,
        startsAt: poll.startsAt,
        endsAt: poll.endsAt,
      },
      analytics: {
        timeline,
        avgCompletionTime,
        peakHour: peakHour ? { hour: parseInt(peakHour[0]), votes: peakHour[1] } : null,
        questionStats,
        inviteStats,
        tokenStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getPollAnalytics };
