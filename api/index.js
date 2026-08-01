// ============================
// CleanStock v2 — Vercel Serverless Entry
// ============================
const app = require('../src/app');
const serverless = require('serverless-http');

// Vercel wraps the Express app as a serverless function
// All API routes are at /api/v1/* mapped in vercel.json
module.exports = serverless(app);