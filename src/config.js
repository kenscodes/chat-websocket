module.exports = {
  PORT: process.env.PORT || 3000,
  RECONNECT_GRACE_MS: 15000,
  MIME_TYPES: {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  }
};
