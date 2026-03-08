import app from './BACKEND/src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`CLASSIC Backend API running on http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
});
