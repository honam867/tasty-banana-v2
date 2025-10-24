import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not defined');
}

const pool = new Pool({
  connectionString: POSTGRES_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);

export { pool };

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (error) {
    throw error;
  }
};

