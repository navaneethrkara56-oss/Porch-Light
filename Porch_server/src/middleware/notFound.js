/**
 * 404 Route Not Found Middleware for Porch Light Server
 * Adheres to Porch Light brand tone: "This address doesn't exist. Let's get you back."
 */

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: "This endpoint doesn't exist. Let's get you back.",
    },
  });
}

module.exports = notFoundHandler;

