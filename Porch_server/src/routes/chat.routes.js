/**
 * Chat Routes for Porch Light Server
 */

const express = require('express');
const chatController = require('../controllers/chat.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/threads', chatController.getChats);
router.post('/threads/find-or-create', chatController.getOrCreateChat);
router.post('/:id/messages', chatController.sendMessage);

module.exports = router;

