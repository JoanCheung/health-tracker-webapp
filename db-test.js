// db-test.js (带有详细诊断日志的版本)
console.log("脚本开始执行...");

try {
    const mysql = require('mysql2/promise');
    console.log("✅ 成功加载 'mysql2/promise' 模块。");

    const fs = require('fs');
    console.log("✅ 成功加载 'fs' 模块。");

    const path = require('path');
    console.log("✅ 成功加载 'path' 模块。");

    // 加载 .env.local 文件
    require('dotenv').config({ path: '.env.local' });
    console.log("✅ 成功配置 'dotenv'。");

    // 检查环境变量是否成功加载
    if (!process.env.DB_HOST) {
        console.error("❌ 致命错误: 未能从 .env.local 文件中加载到 DB_HOST。请检查文件是否存在且格式正确。");
        process.exit(1); // 退出脚本
    }
    console.log("✅ 成功加载环境变量, DB_HOST 是:", process.env.DB_HOST);

    // 检查证书文件是否存在
    const certPath = path.resolve(process.cwd(), 'src/lib/ca-certificate.pem');
    console.log("正在检查证书路径:", certPath);
    if (!fs.existsSync(certPath)) {
        console.error(`❌ 致命错误: 在指定路径找不到证书文件 '${certPath}'。请确认文件已下载并放置在正确位置。`);
        process.exit(1); // 退出脚本
    }
    console.log("✅ 成功找到证书文件。");

    const certContent = fs.readFileSync(certPath, 'utf-8');
    console.log("✅ 成功读取证书文件内容。");

    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: parseInt(process.env.DB_PORT || '3306'),
        ssl: {
            ca: certContent,
        }
    };
    console.log("✅ 成功创建数据库配置对象。");

    async function testDatabaseConnection() {
        console.log("\n=== 进入数据库连接测试函数 ===");
        let connection;
        try {
            console.log("正在尝试建立连接...");
            connection = await mysql.createConnection(dbConfig);
            console.log("✅✅✅ 连接成功！");

            console.log("正在执行测试查询 'SELECT 1'...");
            const [rows] = await connection.execute('SELECT 1 + 1 AS solution');
            console.log("✅✅✅ 查询成功！结果:", rows);

            console.log("\n🎉 最终诊断：所有连接和查询均正常！");

        } catch (error) {
            console.error("\n❌❌❌ 在连接或查询时捕获到错误:", error);
        } finally {
            if (connection) {
                await connection.end();
                console.log("\n连接已关闭。");
            }
        }
    }

    testDatabaseConnection();

} catch (error) {
    console.error("\n❌❌❌ 在脚本准备阶段捕获到致命错误:", error);
} finally {
    console.log("\n脚本执行结束。");
}