import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== Alibaba Cloud RDS Diagnostic Test ===');
  
  const baseConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306')
  };

  console.log('Testing RDS connection with config:', {
    ...baseConfig,
    password: '***'
  });

  // Test different Alibaba Cloud RDS specific configurations
  const tests = [
    {
      name: 'Standard Connection',
      config: {
        ...baseConfig,
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection with SSL disabled',
      config: {
        ...baseConfig,
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection with SSL but no verification',
      config: {
        ...baseConfig,
        ssl: { rejectUnauthorized: false },
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection without database (server-level)',
      config: {
        host: baseConfig.host,
        user: baseConfig.user,
        password: baseConfig.password,
        port: baseConfig.port,
        charset: 'utf8mb4'
      }
    },
    {
      name: 'Connection with timeout settings',
      config: {
        ...baseConfig,
        charset: 'utf8mb4',
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000
      }
    },
    {
      name: 'Legacy MySQL settings',
      config: {
        ...baseConfig,
        charset: 'utf8',
        insecureAuth: true
      }
    }
  ];

  const results = [];
  let successfulConnection = null;

  for (const test of tests) {
    let connection;
    try {
      console.log(`\n--- Testing: ${test.name} ---`);
      
      const startTime = Date.now();
      console.log('Creating connection...');
      
      connection = await mysql.createConnection(test.config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ Connection established in ${connectTime}ms`);
      
      // Try multiple queries to verify the connection
      const queries = [
        { name: 'Basic test', sql: 'SELECT 1 as test' },
        { name: 'Version check', sql: 'SELECT VERSION() as version' },
        { name: 'User info', sql: 'SELECT USER() as current_user' },
        { name: 'Current database', sql: 'SELECT DATABASE() as current_db' }
      ];

      const queryResults = [];
      
      for (const query of queries) {
        try {
          console.log(`Executing: ${query.sql}`);
          const queryStart = Date.now();
          const [rows] = await connection.execute(query.sql);
          const queryTime = Date.now() - queryStart;
          
          console.log(`${query.name} success (${queryTime}ms):`, rows);
          queryResults.push({
            name: query.name,
            success: true,
            time: `${queryTime}ms`,
            result: rows
          });
        } catch (queryError) {
          console.log(`${query.name} failed:`, queryError);
          queryResults.push({
            name: query.name,
            success: false,
            error: queryError instanceof Error ? queryError.message : 'Unknown'
          });
        }
      }

      results.push({
        test: test.name,
        success: true,
        connectTime: `${connectTime}ms`,
        queries: queryResults,
        config: { ...test.config, password: '***' }
      });

      successfulConnection = test;
      console.log(`🎉 SUCCESS! ${test.name} worked!`);
      
      // Don't break here, test all methods to see which ones work
      
    } catch (error) {
      console.log(`❌ ${test.name} FAILED`);
      console.error('Connection details:', {
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
        config: { ...test.config, password: '***' }
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

  const successCount = results.filter(r => r.success).length;
  const overallSuccess = successCount > 0;

  console.log(`\n=== Final Result: ${successCount}/${tests.length} tests passed ===`);

  return NextResponse.json({
    success: overallSuccess,
    message: overallSuccess 
      ? `Found ${successCount} working configuration(s)` 
      : 'All Alibaba Cloud RDS connection attempts failed',
    results: results,
    workingConfigs: results.filter(r => r.success),
    possibleIssues: !overallSuccess ? [
      '1. 数据库用户权限问题 - app_user可能没有远程连接权限',
      '2. RDS白名单设置 - 您的IP可能未被允许连接',
      '3. 数据库不存在 - health_tracker数据库可能未创建',
      '4. 用户名密码错误 - 请验证凭据是否正确',
      '5. RDS实例状态 - 实例可能已停止或重启中',
      '6. 网络配置问题 - VPC或安全组设置'
    ] : [],
    nextSteps: !overallSuccess ? [
      '请检查阿里云RDS控制台中的：',
      '- 数据库账号管理 -> app_user的权限',
      '- 数据安全性 -> 白名单设置',
      '- 数据库管理 -> health_tracker是否存在',
      '- 基本信息 -> 实例状态是否正常'
    ] : []
  });
}