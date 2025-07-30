import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== Simple MySQL Test ===');
  
  // Test without database first
  const config1 = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4'
  };

  // Test with database
  const config2 = {
    ...config1,
    database: process.env.DB_DATABASE
  };

  const results = [];

  // Test 1: Connect without database
  try {
    console.log('Test 1: Connecting without database...');
    const conn1 = await mysql.createConnection(config1);
    console.log('✅ Connected without database');
    
    const [rows1] = await conn1.execute('SELECT 1 as test, USER() as user');
    console.log('Query result:', rows1);
    
    await conn1.end();
    results.push({
      test: 'Connection without database',
      success: true,
      result: rows1
    });
  } catch (error) {
    console.log('❌ Failed to connect without database:', error);
    results.push({
      test: 'Connection without database',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code
    });
  }

  // Test 2: Connect with database
  try {
    console.log('Test 2: Connecting with database...');
    const conn2 = await mysql.createConnection(config2);
    console.log('✅ Connected with database');
    
    const [rows2] = await conn2.execute('SELECT DATABASE() as db, USER() as user');
    console.log('Query result:', rows2);
    
    await conn2.end();
    results.push({
      test: 'Connection with database',
      success: true,
      result: rows2
    });
  } catch (error) {
    console.log('❌ Failed to connect with database:', error);
    results.push({
      test: 'Connection with database',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code
    });
  }

  const successCount = results.filter(r => r.success).length;
  
  return NextResponse.json({
    success: successCount > 0,
    message: `${successCount}/2 tests passed`,
    results: results,
    config: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    }
  });
}