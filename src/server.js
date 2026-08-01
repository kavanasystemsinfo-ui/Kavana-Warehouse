// ============================
// CleanStock v2 — Docker Entry Point
// Starts the Express server on PORT
// ============================
const app = require('./app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`CleanStock v2 API ready on port ${port}`);
});