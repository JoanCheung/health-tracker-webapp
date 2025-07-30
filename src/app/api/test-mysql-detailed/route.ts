import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== Detailed MySQL Connection Analysis ===');
  
  const baseConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306')
  };

  // Test different authentication and connection configurations
  const tests = [
    {
      name: 'Minimal Connection (no database)',
      config: {
        host: baseConfig.host,
        user: baseConfig.user,
        password: baseConfig.password,
        port: baseConfig.port
      }
    },
    {
      name: 'Connection with charset only',
      config: {
        ...baseConfig,
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection with insecureAuth',
      config: {
        ...baseConfig,
        insecureAuth: true,
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection with multipleStatements',
      config: {
        ...baseConfig,
        multipleStatements: true,
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection without database specified',
      config: {
        host: baseConfig.host,
        user: baseConfig.user,
        password: baseConfig.password,
        port: baseConfig.port,
        charset: 'utf8mb4'
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    let connection;
    try {
      console.log(`\n--- Testing: ${test.name} ---`);
      console.log('Config:', { ...test.config, password: '***' });
      
      const startTime = Date.now();
      console.log('Attempting connection...');
      
      connection = await mysql.createConnection(test.config);
      const connectTime = Date.now() - startTime;
      console.log(`✅ Connection established in ${connectTime}ms`);

      // Try basic queries
      const queries = [
        'SELECT 1 as test',
        'SELECT VERSION() as version',
        'SELECT USER() as current_user',
        'SHOW DATABASES'
      ];

      const queryResults = [];
      
      for (const query of queries) {
        try {
          console.log(`Executing: ${query}`);
          const queryStart = Date.now();
          const [rows] = await connection.execute(query);
          const queryTime = Date.now() - queryStart;
          console.log(`Query success (${queryTime}ms):`, rows);
          queryResults.push({
            query,
            success: true,
            time: `${queryTime}ms`,
            result: rows
          });
        } catch (queryError) {
          console.log(`Query failed: ${query}`, queryError);
          queryResults.push({
            query,
            success: false,
            error: queryError instanceof Error ? queryError.message : 'Unknown error'
          });
        }
      }

      results.push({
        test: test.name,
        success: true,
        connectTime: `${connectTime}ms`,
        queries: queryResults
      });

    } catch (error) {
      console.log(`❌ ${test.name} FAILED`);
      console.error('Connection error:', {
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
        errno: (error as any)?.errno,
        sqlState: (error as any)?.sqlState
      });
    } finally {
      if (connection) {
        try {
          await connection.end();
          console.log('Connection closed cleanly');
        } catch (closeError) {
          console.log('Error closing connection:', closeError);
        }
      }
    }
  }

  const successfulTests = results.filter(r => r.success).length;
  const overallSuccess = successfulTests > 0;

  console.log(`\n=== Test Summary: ${successfulTests}/${tests.length} passed ===`);

  return NextResponse.json({
    success: overallSuccess,
    message: `${successfulTests}/${tests.length} detailed connection tests passed`,
    results: results,
    analysis: {
      networkWorking: true,
      mysqlProtocolIssue: successfulTests === 0,
      possibleCauses: successfulTests === 0 ? [
        'Incorrect username/password',
        'Database user permissions issue',
        'Database server configuration problem',
        'MySQL version compatibility issue',
        'Authentication plugin mismatch'
      ] : []
    }
  }, { status: overallSuccess ? 200 : 500 });
}