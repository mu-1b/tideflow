import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb, dbReady } from './db.js';
import tides from './routes/tides.js';
import user from './routes/user.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, database: dbReady() }));
app.use('/api', tides);
app.use('/api', user);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.name === 'ValidationError' ? 400 : 502).json({ error: err.message });
});

const port = Number(process.env.PORT) || 4000;
await connectDb(process.env.MONGODB_URI);
app.listen(port, () => console.log(`TideFlow API on http://localhost:${port}`));
