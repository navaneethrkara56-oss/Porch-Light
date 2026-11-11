const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health - Public health check
router.get('/', getHealth);

module.exports = router;

