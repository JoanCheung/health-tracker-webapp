import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== Direct Connection Test ===');
  
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4'
  };
  
  console.log('Connection config:', {
    ...config,
    password: config.password ? `***${config.password.slice(-4)}` : 'NOT SET'
  });

  // Test different connection approaches
  const tests = [
    {
      name: 'Direct Connection (No SSL)',
      createConnection: () => mysql.createConnection(config)
    },
    {
      name: 'Direct Connection with SSL disabled',
      createConnection: () => mysql.createConnection({
        ...config
      })
    },
    {
      name: 'Direct Connection with SSL reject unauthorized false',
      createConnection: () => mysql.createConnection({
        ...config,
        ssl: { rejectUnauthorized: false }
      })
    },
    {
      name: 'Connection with longer timeout',
      createConnection: () => mysql.createConnection({
        ...config,
        connectTimeout: 30000
      })
    }
  ];

  const results = [];

  for (const test of tests) {
    let connection;
    try {
      console.log(`\n--- Testing: ${test.name} ---`);
      
      const startTime = Date.now();
      console.log('Creating connection...');
      connection = await test.createConnection();
      const connectTime = Date.now() - startTime;
      console.log(`Connection created in ${connectTime}ms`);

      console.log('Testing query...');
      const queryStart = Date.now();
      const [rows] = await connection.execute('SELECT 1 as test, CONNECTION_ID() as conn_id');
      const queryTime = Date.now() - queryStart;
      
      console.log(`✅ ${test.name} SUCCESS`);
      console.log(`Connection time: ${connectTime}ms, Query time: ${queryTime}ms`);
      console.log('Result:', rows);

      results.push({
        test: test.name,
        success: true,
        connectTime: `${connectTime}ms`,
        queryTime: `${queryTime}ms`,
        result: rows
      });

      // If this test succeeded, try a few more queries
      try {
        const [dbInfo] = await connection.execute('SELECT DATABASE() as db_name, USER() as user_name, VERSION() as version');
        console.log('Database info:', dbInfo);
        (results[results.length - 1] as any).dbInfo = dbInfo;
      } catch (infoError) {
        console.log('Could not get database info:', infoError);
      }

    } catch (error) {
      console.log(`❌ ${test.name} FAILED`);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        errno: (error as any)?.errno,
        sqlState: (error as any)?.sqlState,
        sqlMessage: (error as any)?.sqlMessage,
        fatal: (error as any)?.fatal
      });

      results.push({
        test: test.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        errno: (error as any)?.errno
      });
    } finally {
      if (connection) {
        try {
          await connection.end();
          console.log('Connection closed');
        } catch (closeError) {
          console.log('Error closing connection:', closeError);
        }
      }
    }
  }

  const successfulTests = results.filter(r => r.success).length;
  const overallSuccess = successfulTests > 0;

  return NextResponse.json({
    success: overallSuccess,
    message: `${successfulTests}/${tests.length} connection tests passed`,
    results: results,
    config: {
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      user: process.env.DB_USER
    }
  }, { status: overallSuccess ? 200 : 500 });
}