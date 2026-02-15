require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Poll = require('../models/Poll.model');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pollmaster');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Poll.deleteMany({});
    console.log('Cleared existing data');

    // Create demo host user
    const host = await User.create({
      email: 'demo@pollmaster.io',
      username: 'demohost',
      password: 'demo1234',
      displayName: 'Demo Host',
      isVerified: true,
      pollsCreated: 3,
    });

    console.log('Created user: demo@pollmaster.io / demo1234');

    // Create sample polls
    const polls = [
      {
        title: 'Best Frontend Framework 2025',
        description: 'Vote for your preferred frontend JavaScript framework!',
        host: host._id,
        accessType: 'public',
        eligibility: { type: 'public' },
        resultVisibility: { mode: 'real_time' },
        status: 'active',
        isPublished: true,
        category: 'survey',
        tags: ['tech', 'frontend', 'javascript'],
        questions: [{
          id: 'q1',
          type: 'single_choice',
          text: 'Which frontend framework do you prefer?',
          required: true,
          options: [
            { id: 'o1', text: 'React', voteCount: 145, order: 0 },
            { id: 'o2', text: 'Vue.js', voteCount: 89, order: 1 },
            { id: 'o3', text: 'Angular', voteCount: 42, order: 2 },
            { id: 'o4', text: 'Svelte', voteCount: 67, order: 3 },
          ],
          settings: {},
          order: 0,
        }],
        stats: { totalVotes: 343, uniqueVoters: 343, lastVoteAt: new Date() },
      },
      {
        title: 'Community Event Date Poll',
        description: 'Help us pick the best date for our upcoming community event.',
        host: host._id,
        accessType: 'code',
        eligibility: { type: 'code', accessCode: 'COMMUNITY' },
        resultVisibility: { mode: 'on_close' },
        status: 'active',
        isPublished: true,
        category: 'event',
        tags: ['community', 'event'],
        questions: [{
          id: 'q1',
          type: 'single_choice',
          text: 'Which date works best for you?',
          required: true,
          options: [
            { id: 'o1', text: 'March 15, 2025', voteCount: 28, order: 0 },
            { id: 'o2', text: 'March 22, 2025', voteCount: 41, order: 1 },
            { id: 'o3', text: 'March 29, 2025', voteCount: 19, order: 2 },
          ],
          settings: {},
          order: 0,
        }],
        stats: { totalVotes: 88, uniqueVoters: 88, lastVoteAt: new Date() },
      },
      {
        title: 'Product Satisfaction Survey',
        description: 'How satisfied are you with our product? This is a quick 3-question survey.',
        host: host._id,
        accessType: 'public',
        eligibility: { type: 'public' },
        resultVisibility: { mode: 'host_release' },
        status: 'draft',
        isPublished: false,
        category: 'survey',
        tags: ['product', 'feedback'],
        questions: [
          {
            id: 'q1',
            type: 'rating',
            text: 'How would you rate our product overall?',
            required: true,
            options: [],
            settings: { maxRating: 5 },
            order: 0,
          },
          {
            id: 'q2',
            type: 'single_choice',
            text: 'How did you hear about us?',
            required: true,
            options: [
              { id: 'o1', text: 'Social Media', voteCount: 0, order: 0 },
              { id: 'o2', text: 'Friend / Referral', voteCount: 0, order: 1 },
              { id: 'o3', text: 'Search Engine', voteCount: 0, order: 2 },
              { id: 'o4', text: 'Other', voteCount: 0, order: 3 },
            ],
            settings: {},
            order: 1,
          },
        ],
        stats: { totalVotes: 0, uniqueVoters: 0 },
      },
    ];

    for (const pollData of polls) {
      await Poll.create(pollData);
    }

    console.log(`Created ${polls.length} sample polls`);
    console.log('\n✅ Seed completed!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Email:    demo@pollmaster.io');
    console.log('   Password: demo1234');
    console.log('\n🌐 Start the app:');
    console.log('   Backend:  npm run dev (in /backend)');
    console.log('   Frontend: npm run dev (in /frontend)');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
