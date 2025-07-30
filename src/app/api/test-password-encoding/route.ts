import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== Password Encoding Test ===');
  
  const originalPassword = process.env.DB_PASSWORD;
  console.log('Original password length:', originalPassword?.length);
  console.log('Contains @ symbol:', originalPassword?.includes('@'));
  
  if (!originalPassword) {
    return NextResponse.json({
      success: false,
      error: 'DB_PASSWORD not set'
    });
  }

  const baseConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4'
  };

  // Test different password encoding approaches
  const tests = [
    {
      name: 'Original password (as-is)',
      config: {
        ...baseConfig,
        password: originalPassword
      }
    },
    {
      name: 'URL encoded password',
      config: {
        ...baseConfig,
        password: encodeURIComponent(originalPassword)
      }
    },
    {
      name: 'Escaped @ symbols',
      config: {
        ...baseConfig,
        password: originalPassword.replace(/@/g, '\\@')
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    let connection;
    try {
      console.log(`\n--- Testing: ${test.name} ---`);
      console.log('Password preview:', test.config.password.substring(0, 5) + '***' + test.config.password.slice(-2));
      
      const startTime = Date.now();
      connection = await mysql.createConnection(test.config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ ${test.name} - Connection SUCCESS (${connectTime}ms)`);
      
      // Try a simple query
      const [rows] = await connection.execute('SELECT USER() as current_user, DATABASE() as current_db');
      console.log('Query result:', rows);
      
      results.push({
        test: test.name,
        success: true,
        connectTime: `${connectTime}ms`,
        queryResult: rows
      });
      
      // If this works, we found the solution!
      break;
      
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED`);
      console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
      
      results.push({
        test: test.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code
      });
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (closeError) {
          console.log('Error closing connection:', closeError);
        }
      }
    }
  }

  const successfulTest = results.find(r => r.success);
  const overallSuccess = !!successfulTest;

  return NextResponse.json({
    success: overallSuccess,
    message: overallSuccess ? `Solution found: ${successfulTest.test}` : 'No encoding method worked',
    results: results,
    solution: overallSuccess ? {
      method: successfulTest.test,
      recommendation: successfulTest.test.includes('URL encoded') 
        ? 'Use encodeURIComponent() for password in connection config'
        : successfulTest.test.includes('Escaped')
        ? 'Escape @ symbols with \\@ in password'
        : 'Original password works as-is'
    } : null,
    passwordInfo: {
      length: originalPassword.length,
      containsAt: originalPassword.includes('@'),
      preview: originalPassword.substring(0, 3) + '***' + originalPassword.slice(-2)
    }
  });
}