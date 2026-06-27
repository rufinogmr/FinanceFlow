import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './middleware/auth.js';
import exportRouter from './routes/export.js';
import aiRouter from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.uid || req.ip,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/export', requireAuth, exportRouter);
app.use('/api/ai', requireAuth, aiLimiter, aiRouter);

app.use((err, _req, res, _next) => {
  console.error('[BFF Error]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => console.log(`BFF rodando em http://localhost:${PORT}`));

export default app;
