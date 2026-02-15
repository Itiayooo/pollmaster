const Poll = require('../models/Poll.model');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

// ─── POST /api/invites/send ───────────────────────────────────────────────────
const sendInvites = async (req, res, next) => {
  try {
    const poll = req.poll;

    if (poll.accessType !== 'invite') {
      return res.status(400).json({ success: false, message: 'This poll does not use invite-based access.' });
    }

    const { emails } = req.body; // optional: send to specific emails only
    const toSend = emails
      ? poll.invites.filter((i) => emails.includes(i.email) && i.status === 'pending')
      : poll.invites.filter((i) => i.status === 'pending');

    if (toSend.length === 0) {
      return res.json({ success: true, message: 'No pending invites to send.', sent: 0 });
    }

    const transporter = getTransporter();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let sent = 0;
    let failed = 0;

    for (const invite of toSend) {
      try {
        const voteUrl = `${baseUrl}/vote/${poll.slug}?token=${invite.token}`;
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'PollMaster <noreply@pollmaster.io>',
          to: invite.email,
          subject: `You're invited to vote: ${poll.title}`,
          html: buildInviteEmail(poll, invite.email, voteUrl),
        });

        // Mark as sent
        await Poll.updateOne(
          { _id: poll._id, 'invites.token': invite.token },
          { $set: { 'invites.$.sentAt': new Date(), 'invites.$.status': 'sent' } }
        );
        sent++;
      } catch (err) {
        await Poll.updateOne(
          { _id: poll._id, 'invites.token': invite.token },
          { $set: { 'invites.$.status': 'failed' } }
        );
        failed++;
      }
    }

    res.json({
      success: true,
      message: `${sent} invite(s) sent.${failed > 0 ? ` ${failed} failed.` : ''}`,
      sent,
      failed,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/invites/add ────────────────────────────────────────────────────
const addInvitees = async (req, res, next) => {
  try {
    const poll = req.poll;
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ success: false, message: 'Emails array required.' });
    }

    const existing = poll.invites.map((i) => i.email);
    const newEmails = [...new Set(emails.map((e) => e.toLowerCase()))].filter(
      (e) => !existing.includes(e)
    );

    const newInvites = newEmails.map((email) => ({
      email,
      token: crypto.randomBytes(12).toString('hex'),
      status: 'pending',
    }));

    poll.invites.push(...newInvites);
    await poll.save();

    res.json({ success: true, added: newInvites.length, message: `${newInvites.length} new invitee(s) added.` });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/invites/poll/:pollId ────────────────────────────────────────────
const getInviteList = async (req, res, next) => {
  try {
    const poll = req.poll;
    res.json({
      success: true,
      invites: poll.invites,
      stats: {
        total: poll.invites.length,
        pending: poll.invites.filter((i) => i.status === 'pending').length,
        sent: poll.invites.filter((i) => i.status === 'sent').length,
        voted: poll.invites.filter((i) => i.votedAt).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Email Template ───────────────────────────────────────────────────────────
const buildInviteEmail = (poll, email, voteUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f0f0; margin: 0; padding: 40px 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
    .logo { color: #e94560; font-size: 28px; font-weight: 900; letter-spacing: -1px; }
    .body { padding: 40px; }
    h1 { color: #1a1a2e; font-size: 22px; margin: 0 0 16px; }
    p { color: #555; line-height: 1.6; margin: 0 0 16px; }
    .poll-title { background: #f8f9ff; border-left: 4px solid #e94560; padding: 16px 20px; border-radius: 0 8px 8px 0; font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 24px 0; }
    .cta { display: block; background: #e94560; color: white !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; text-align: center; margin: 32px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; padding: 24px 40px; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PollMaster</div>
    </div>
    <div class="body">
      <h1>You've been invited to vote</h1>
      <p>You have been invited to participate in the following poll:</p>
      <div class="poll-title">${poll.title}</div>
      ${poll.description ? `<p>${poll.description}</p>` : ''}
      ${poll.endsAt ? `<p><strong>Voting closes:</strong> ${new Date(poll.endsAt).toLocaleDateString('en-US', { dateStyle: 'full' })}</p>` : ''}
      <p>Click the button below to cast your vote. This link is unique to you and can only be used once.</p>
      <a href="${voteUrl}" class="cta">Cast My Vote →</a>
      <p style="font-size: 13px; color: #999;">If the button doesn't work, copy and paste this link:<br><a href="${voteUrl}" style="color: #e94560;">${voteUrl}</a></p>
    </div>
    <div class="footer">
      <p>This invite was sent to ${email} via PollMaster.<br>
      If you believe this was sent in error, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = { sendInvites, addInvitees, getInviteList };
