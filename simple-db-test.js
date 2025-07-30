// 简化的数据库连接测试脚本
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

console.log('=== 阿里云RDS连接诊断脚本 ===\n');

// 显示配置信息
console.log('配置信息:');
console.log('- 主机:', process.env.DB_HOST);
console.log('- 用户:', process.env.DB_USER);
console.log('- 数据库:', process.env.DB_DATABASE);
console.log('- 端口:', process.env.DB_PORT);
console.log('- 密码长度:', process.env.DB_PASSWORD?.length);
console.log('- 密码包含@:', process.env.DB_PASSWORD?.includes('@'));
console.log('');

// 测试配置
const baseConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    connectTimeout: 30000
};

const tests = [
    {
        name: '1. 基础连接（无SSL，无数据库）',
        config: {
            ...baseConfig,
            charset: 'utf8mb4'
        }
    },
    {
        name: '2. 基础连接（指定数据库）',
        config: {
            ...baseConfig,
            database: process.env.DB_DATABASE,
            charset: 'utf8mb4'
        }
    },
    {
        name: '3. 使用SSL证书连接',
        config: {
            ...baseConfig,
            database: process.env.DB_DATABASE,
            charset: 'utf8mb4',
            ssl: {
                ca: fs.readFileSync(path.resolve('src/lib/ca-certificate.pem'), 'utf-8')
            }
        }
    },
    {
        name: '4. SSL但不验证证书',
        config: {
            ...baseConfig,
            database: process.env.DB_DATABASE,
            charset: 'utf8mb4',
            ssl: {
                rejectUnauthorized: false
            }
        }
    }
];

async function runTests() {
    for (const test of tests) {
        console.log(`\n开始测试: ${test.name}`);
        console.log('配置:', JSON.stringify({ ...test.config, password: '***' }, null, 2));
        
        let connection;
        try {
            const startTime = Date.now();
            connection = await mysql.createConnection(test.config);
            const connectTime = Date.now() - startTime;
            
            console.log(`✅ 连接成功！用时: ${connectTime}ms`);
            
            // 执行测试查询
            try {
                const [rows] = await connection.execute('SELECT 1 as test, USER() as user, @@version as version');
                console.log('✅ 查询成功:', rows[0]);
                
                // 如果指定了数据库，测试数据库查询
                if (test.config.database) {
                    const [dbRows] = await connection.execute('SELECT DATABASE() as current_db');
                    console.log('✅ 当前数据库:', dbRows[0]);
                }
                
                console.log(`🎉 ${test.name} - 完全成功！`);
                return; // 成功后不再测试其他配置
                
            } catch (queryError) {
                console.log('❌ 查询失败:', queryError.message);
            }
            
        } catch (error) {
            console.log('❌ 连接失败:');
            console.log('  错误消息:', error.message);
            console.log('  错误代码:', error.code);
            console.log('  SQL状态:', error.sqlState);
            console.log('  错误号:', error.errno);
        } finally {
            if (connection) {
                try {
                    await connection.end();
                    console.log('连接已关闭');
                } catch (closeError) {
                    console.log('关闭连接时出错:', closeError.message);
                }
            }
        }
    }
    
    console.log('\n❌ 所有连接测试都失败了！');
    console.log('\n🔧 建议检查：');
    console.log('1. RDS实例是否正在运行');
    console.log('2. 外网地址是否已申请');
    console.log('3. VPC安全组是否开放3306端口');
    console.log('4. 白名单是否包含您的IP');
    console.log('5. 用户权限是否正确配置');
    console.log('6. 在RDS控制台使用DMS测试连接');
}

runTests().catch(console.error);