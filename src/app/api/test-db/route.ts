import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/db-utils';

export async function GET(request: NextRequest) {
  console.log('=== Database Connection Test ===');
  console.log('Environment Variables Check:');
  console.log({
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    DB_USER: process.env.DB_USER || 'NOT SET', 
    DB_DATABASE: process.env.DB_DATABASE || 'NOT SET',
    DB_PORT: process.env.DB_PORT || 'NOT SET',
    DB_PASSWORD: process.env.DB_PASSWORD ? `Set (${process.env.DB_PASSWORD.length} chars)` : 'NOT SET'
  });

  // Test multiple connection approaches
  const tests = [
    { name: 'Basic Query Test', query: 'SELECT 1 AS test' },
    { name: 'Time Query Test', query: 'SELECT NOW() AS current_time' },
    { name: 'Database Info Test', query: 'SELECT DATABASE() AS db_name, USER() AS current_user' }
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`\n--- ${test.name} ---`);
      console.log(`Executing: ${test.query}`);
      
      const startTime = Date.now();
      const rows = await executeQuery(test.query);
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${test.name} SUCCESS (${duration}ms)`);
      console.log('Result:', rows);
      
      results.push({
        test: test.name,
        success: true,
        duration: `${duration}ms`,
        result: rows
      });
    } catch (error) {
      console.log(`❌ ${test.name} FAILED`);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        errno: (error as any)?.errno,
        sqlState: (error as any)?.sqlState,
        sqlMessage: (error as any)?.sqlMessage
      });
      
      results.push({
        test: test.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code
      });
    }
  }

  const successfulTests = results.filter(r => r.success).length;
  const overallSuccess = successfulTests > 0;

  return NextResponse.json({
    success: overallSuccess,
    message: `${successfulTests}/${tests.length} tests passed`,
    results: results,
    config: {
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      user: process.env.DB_USER
    }
  }, { status: overallSuccess ? 200 : 500 });
}