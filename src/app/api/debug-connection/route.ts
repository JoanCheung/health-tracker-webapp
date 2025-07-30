import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== Debug Connection Test ===');
  
  // Log environment variables (without password)
  console.log('Environment check:', {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_PORT: process.env.DB_PORT,
    passwordLength: process.env.DB_PASSWORD?.length,
    passwordHasAt: process.env.DB_PASSWORD?.includes('@')
  });

  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4',
    connectTimeout: 10000
  };

  console.log('Connection config:', {
    ...config,
    password: `***${config.password?.slice(-3)}`
  });

  let connection;
  try {
    console.log('Attempting connection...');
    const startTime = Date.now();
    
    connection = await mysql.createConnection(config);
    const connectTime = Date.now() - startTime;
    
    console.log(`✅ Connection successful in ${connectTime}ms`);
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time, CONNECTION_ID() as conn_id');
    console.log('Query result:', rows);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      connectTime: `${connectTime}ms`,
      result: rows,
      config: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT
      }
    });
    
  } catch (error) {
    console.log('❌ Connection failed');
    console.error('Detailed error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
      fatal: (error as any)?.fatal,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      details: 'Check server logs for more information',
      possibleSolutions: [
        '1. 确认RDS实例状态为运行中',
        '2. 确认外网地址已开启',
        '3. 检查VPC安全组是否开放3306端口',
        '4. 确认用户权限允许远程连接(%)',
        '5. 确认白名单包含您的IP地址',
        '6. 尝试在RDS控制台的数据库连接页面测试连接'
      ]
    }, { status: 500 });
    
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