import express from 'express';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import cohortRoutes from './routes/cohorts.js';
import outreachRoutes from './routes/outreach.js';
import assignmentRoutes from './routes/assignments.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/cohorts', outreachRoutes);
app.use('/api/assignments', assignmentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`BEL Retention API listening on port ${PORT}`);
});
