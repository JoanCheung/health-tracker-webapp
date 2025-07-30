// 测试原生mysql驱动 vs mysql2
require('dotenv').config({ path: '.env.local' });

console.log('=== 测试不同MySQL驱动 ===\n');

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4',
    timeout: 30000
};

console.log('配置信息:', {
    ...config,
    password: '***'
});

async function testMysql2() {
    console.log('\n--- 测试 mysql2/promise ---');
    try {
        const mysql2 = require('mysql2/promise');
        const connection = await mysql2.createConnection(config);
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ mysql2 成功:', rows);
        await connection.end();
        return true;
    } catch (error) {
        console.log('❌ mysql2 失败:', error.message);
        return false;
    }
}

async function testMysql() {
    console.log('\n--- 测试原生 mysql ---');
    return new Promise((resolve) => {
        try {
            const mysql = require('mysql');
            const connection = mysql.createConnection({
                ...config,
                acquireTimeout: 60000,
                reconnect: true
            });
            
            connection.connect((err) => {
                if (err) {
                    console.log('❌ mysql 连接失败:', err.message);
                    connection.destroy();
                    resolve(false);
                    return;
                }
                
                console.log('✅ mysql 连接成功!');
                
                connection.query('SELECT 1 as test', (err, results) => {
                    if (err) {
                        console.log('❌ mysql 查询失败:', err.message);
                        resolve(false);
                    } else {
                        console.log('✅ mysql 查询成功:', results);
                        resolve(true);
                    }
                    connection.end();
                });
            });
            
            connection.on('error', (err) => {
                console.log('❌ mysql 连接错误:', err.message);
                resolve(false);
            });
            
        } catch (error) {
            console.log('❌ mysql 初始化失败:', error.message);
            resolve(false);
        }
    });
}

async function runTests() {
    const mysql2Success = await testMysql2();
    const mysqlSuccess = await testMysql();
    
    console.log('\n=== 测试结果 ===');
    console.log('mysql2:', mysql2Success ? '✅ 成功' : '❌ 失败');
    console.log('mysql:', mysqlSuccess ? '✅ 成功' : '❌ 失败');
    
    if (mysqlSuccess && !mysql2Success) {
        console.log('\n🎉 解决方案：使用原生mysql驱动替代mysql2！');
    } else if (!mysqlSuccess && !mysql2Success) {
        console.log('\n❌ 两个驱动都失败了，问题可能更深层');
    } else if (mysql2Success) {
        console.log('\n✅ mysql2可以工作，问题在其他地方');
    }
}

runTests().catch(console.error);