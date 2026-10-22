import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Evita fallos TLS/Atlas comunes en Node 17+ (Windows) al preferir IPv4
dns.setDefaultResultOrder('ipv4first');

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());
app.use(
  morgan('dev', {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'NexoLab API', status: 'ok' });
});

app.use('/api', routes);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`NexoLab API escuchando en http://localhost:${port}`);
});
