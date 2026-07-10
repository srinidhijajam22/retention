import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import authRoutes from './routes/auth.js';
import cohortRoutes from './routes/cohorts.js';
import outreachRoutes from './routes/outreach.js';
import assignmentRoutes from './routes/assignments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Allow all origins by default (fine here since auth is a bearer token, not a cookie —
// no CSRF exposure from permissive CORS). Set ALLOWED_ORIGIN to lock it down to your
// frontend's exact domain once you know it (e.g. https://your-app.vercel.app).
app.use(cors(process.env.ALLOWED_ORIGIN ? { origin: process.env.ALLOWED_ORIGIN } : {}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/cohorts', outreachRoutes);
app.use('/api/assignments', assignmentRoutes);

// In production, serve the built React app from the same service so the whole
// app deploys as a single process — no separate static host / CORS needed.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`BEL Retention API listening on port ${PORT}`);
});
