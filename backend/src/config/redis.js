import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do cliente Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Event handlers para monitoramento
redisClient.on('connect', () => {
  console.log('Conectando ao Redis...');
});

redisClient.on('ready', () => {
  console.log('Redis está pronto para uso.');
});

redisClient.on('error', (err) => {
  console.error('Erro no Redis:', err);
});

redisClient.on('close', () => {
  console.log('Conexão com Redis fechada.');
});

export default redisClient;

