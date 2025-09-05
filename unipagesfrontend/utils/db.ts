import { Pool, PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __UNIPAGES_PG_POOL__: Pool | undefined;
}

async function createPgPool(): Promise<Pool> {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL (or DATABASE_URL) is required');
  }

  console.log('Creating PostgreSQL pool with connection string:', connectionString.substring(0, 20) + '...');
  console.log('SSL Mode:', process.env.PGSSLMODE);

  const poolConfig: PoolConfig = {
    connectionString,
    ssl: process.env.PGSSLMODE === 'require' ? { 
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined // Skip hostname verification
    } : undefined,
    // Tunables (with sensible defaults) – can be overridden via env
    max: Number.parseInt(process.env.PGPOOL_MAX || '20', 10), // Increased pool size
    idleTimeoutMillis: Number.parseInt(process.env.PGPOOL_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: Number.parseInt(process.env.PGPOOL_CONNECTION_TIMEOUT_MS || '10000', 10), // Increased timeout
    keepAlive: true,
  };

  const newPool = new Pool(poolConfig);

  // Optional per-connection session parameters
  newPool.on('connect', (client) => {
    console.log('New PostgreSQL client connected');
    const statements: string[] = [];
    const statementTimeout = process.env.PG_STATEMENT_TIMEOUT_MS;
    const idleInTxnTimeout = process.env.PG_IDLE_IN_TXN_TIMEOUT_MS;
    if (statementTimeout && !Number.isNaN(Number(statementTimeout))) {
      statements.push(`SET statement_timeout TO ${Number(statementTimeout)}`);
    }
    if (idleInTxnTimeout && !Number.isNaN(Number(idleInTxnTimeout))) {
      statements.push(`SET idle_in_transaction_session_timeout TO ${Number(idleInTxnTimeout)}`);
    }
    if (statements.length > 0) {
      client.query(statements.join('; ')).catch((err) => {
        console.warn('Failed to set session parameters for PG client', err);
      });
    }
  });

  newPool.on('error', (err) => {
    console.error('Unexpected PG client error', err);
  });

  // Test the connection
  try {
    const client = await newPool.connect();
    console.log('Database connection test successful');
    client.release();
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return newPool;
}

export async function getPgPool(): Promise<Pool> {
  if (!global.__UNIPAGES_PG_POOL__) {
    global.__UNIPAGES_PG_POOL__ = await createPgPool();
  }
  return global.__UNIPAGES_PG_POOL__;
}

// Enhanced pool with optimized settings
export async function getOptimizedPgPool(): Promise<Pool> {
  const pool = await getPgPool();
  return pool;
}

export async function runInTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const pool = await getPgPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

