import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
});
export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to the database.');
  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    process.exit(1);
  }
}
