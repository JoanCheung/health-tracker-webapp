// 测试Supabase连接
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('=== Supabase 连接测试 ===\n');

// 检查环境变量
console.log('环境变量检查:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已设置' : '❌ 未设置');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 已设置' : '❌ 未设置');
console.log('URL值:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key长度:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length, '字符');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n❌ 环境变量缺失，请检查.env.local文件');
    process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function testConnection() {
    try {
        console.log('\n--- 测试1: 基本连接测试 ---');
        
        // 测试基本连接 - 获取所有表
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
            
        if (tablesError) {
            console.log('❌ 无法获取表列表:', tablesError.message);
        } else {
            console.log('✅ 连接成功! 找到的表:');
            tables?.forEach(table => console.log(`  - ${table.table_name}`));
        }

        console.log('\n--- 测试2: 检查records表是否存在 ---');
        
        // 检查records表结构
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'records')
            .eq('table_schema', 'public');
            
        if (columnsError) {
            console.log('❌ records表不存在或无法访问:', columnsError.message);
            console.log('📝 需要在Supabase中创建records表!');
        } else if (!columns || columns.length === 0) {
            console.log('❌ records表不存在');
            console.log('📝 需要在Supabase中创建records表!');
        } else {
            console.log('✅ records表存在，字段结构:');
            columns.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? '可空' : '必需'})`);
            });
        }

        console.log('\n--- 测试3: 尝试查询records表 ---');
        
        const { data: records, error: selectError } = await supabase
            .from('records')
            .select('*')
            .limit(5);
            
        if (selectError) {
            console.log('❌ 查询records表失败:', selectError.message);
            if (selectError.message.includes('relation "public.records" does not exist')) {
                console.log('💡 确认: records表不存在，需要创建!');
            }
        } else {
            console.log('✅ 查询成功! 数据条数:', records?.length || 0);
            if (records && records.length > 0) {
                console.log('最新记录:', records[0]);
            }
        }

        console.log('\n--- 测试4: 尝试插入测试数据 ---');
        
        const testRecord = {
            height: 170,
            weight: 65,
            tongue_body_color: '淡红色',
            tongue_shape: '正常',
            tongue_coating_color: '白苔',
            tongue_coating_thickness: '薄苔',
            mood: '良好',
            symptoms: '测试数据',
            medical_records: null,
            image_url: null,
            analysis_result: { test: true },
            created_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
            .from('records')
            .insert([testRecord])
            .select();
            
        if (insertError) {
            console.log('❌ 插入测试数据失败:', insertError.message);
            console.log('错误详情:', insertError);
        } else {
            console.log('✅ 插入测试数据成功!');
            console.log('插入的数据:', insertData);
        }

    } catch (error) {
        console.log('❌ 测试过程中发生错误:', error.message);
    }
}

console.log('\n开始测试...\n');
testConnection().then(() => {
    console.log('\n=== 测试完成 ===');
}).catch(error => {
    console.log('\n❌ 测试失败:', error.message);
});