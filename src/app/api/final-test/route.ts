import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  console.log('=== 最终测试 - Final Test ===');
  
  const tests = [
    {
      name: '1. 服务器级连接测试（不指定数据库）',
      config: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '3306'),
        charset: 'utf8mb4',
        connectTimeout: 15000
      }
    },
    {
      name: '2. 指定数据库连接测试',
      config: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: parseInt(process.env.DB_PORT || '3306'),
        charset: 'utf8mb4',
        connectTimeout: 15000
      }
    }
  ];

  const results = [];
  
  for (const test of tests) {
    let connection;
    try {
      console.log(`开始测试: ${test.name}`);
      
      const startTime = Date.now();
      connection = await mysql.createConnection(test.config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ 连接成功！用时: ${connectTime}ms`);
      
      // 执行基本查询
      const queries = [
        'SELECT 1 as test',
        'SELECT USER() as current_user',
        'SELECT @@version as mysql_version',
        'SHOW DATABASES'
      ];
      
      const queryResults = [];
      for (const query of queries) {
        try {
          const [rows] = await connection.execute(query);
          queryResults.push({ query, success: true, result: rows });
        } catch (queryError) {
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
      
      console.log(`🎉 ${test.name} 测试成功！`);
      
    } catch (error) {
      console.log(`❌ ${test.name} 失败:`);
      console.error(error);
      
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
        } catch (closeError) {
          console.log('关闭连接时出错:', closeError);
        }
      }
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const isSuccess = successCount > 0;
  
  return NextResponse.json({
    success: isSuccess,
    message: isSuccess ? 
      `🎉 成功！${successCount}/${tests.length} 个测试通过` : 
      '❌ 所有连接测试都失败了',
    results: results,
    nextSteps: isSuccess ? [
      '连接成功！可以开始使用数据库了',
      '建议创建必要的数据表',
      '测试应用程序的数据库操作'
    ] : [
      '1. 检查RDS实例状态是否为"运行中"',
      '2. 确认外网地址已正确申请和配置',
      '3. 检查VPC安全组是否开放3306端口',
      '4. 尝试在RDS控制台使用DMS直接连接测试',
      '5. 考虑重新申请外网地址',
      '6. 联系阿里云技术支持'
    ],
    config: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      passwordLength: process.env.DB_PASSWORD?.length
    }
  });
}