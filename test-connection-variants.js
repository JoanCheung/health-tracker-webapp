// 测试各种连接参数组合
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

console.log('=== 测试各种连接参数组合 ===\n');

const baseConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306')
};

// 不同的参数组合
const testConfigs = [
    {
        name: '最小配置',
        config: baseConfig
    },
    {
        name: '指定MySQL版本8.0',
        config: {
            ...baseConfig,
            authPlugins: {
                mysql_native_password: () => require('mysql2/lib/auth_plugins').mysql_native_password
            }
        }
    },
    {
        name: '老版本兼容模式',
        config: {
            ...baseConfig,
            supportBigNumbers: true,
            bigNumberStrings: true,
            insecureAuth: true
        }
    },
    {
        name: '指定字符集和时区',
        config: {
            ...baseConfig,
            charset: 'UTF8_GENERAL_CI',
            timezone: '+08:00'
        }
    },
    {
        name: 'TCP keepalive',
        config: {
            ...baseConfig,
            socketPath: undefined,
            flags: '-FOUND_ROWS'
        }
    },
    {
        name: '禁用压缩和缓存',
        config: {
            ...baseConfig,
            compress: false,
            queryFormat: undefined
        }
    },
    {
        name: '使用IP地址而非域名',
        config: {
            ...baseConfig,
            host: '198.18.9.114' // nslookup 得到的实际IP
        }
    }
];

async function testConnection(testConfig) {
    console.log(`\n--- 测试: ${testConfig.name} ---`);
    console.log('配置:', JSON.stringify({
        ...testConfig.config,
        password: '***'
    }, null, 2));
    
    let connection;
    try {
        const startTime = Date.now();
        connection = await mysql.createConnection(testConfig.config);
        const connectTime = Date.now() - startTime;
        
        console.log(`✅ 连接成功! (${connectTime}ms)`);
        
        // 测试查询
        const [rows] = await connection.execute('SELECT 1 as test, USER() as user, @@version as version');
        console.log('✅ 查询成功:', rows[0]);
        
        return true;
        
    } catch (error) {
        console.log('❌ 失败:', error.message);
        console.log('错误代码:', error.code);
        return false;
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (e) {}
        }
    }
}

async function runAllTests() {
    let successCount = 0;
    
    for (const testConfig of testConfigs) {
        const success = await testConnection(testConfig);
        if (success) {
            successCount++;
            console.log(`\n🎉 找到可行方案: ${testConfig.name}`);
            break; // 找到一个可行的就停止
        }
    }
    
    if (successCount === 0) {
        console.log('\n❌ 所有连接方式都失败了');
        console.log('\n🔧 建议尝试:');
        console.log('1. 联系阿里云技术支持');
        console.log('2. 尝试使用内网连接');
        console.log('3. 考虑更换数据库服务商');
    }
}

runAllTests().catch(console.error);