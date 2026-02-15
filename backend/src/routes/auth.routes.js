const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

module.exports = router;
