const app = require('./server');

// This file is the entry point for the application
// It imports the Express app from server.js and ensures the app starts

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});