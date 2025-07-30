import pool from './db';

export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T> {
  try {
    const [rows] = await pool.execute(query, params);
    return rows as T;
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}