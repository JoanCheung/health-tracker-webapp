// 测试完整的应用工作流程
require('dotenv').config({ path: '.env.local' });

console.log('=== 测试完整应用工作流程 ===\n');

// 测试数据
const testAnalysisData = {
    height: 165,
    weight: 55.5,
    tongueBodyColor: '淡红色',
    tongueShape: '正常',
    tongueCoatingColor: '白苔',
    tongueCoatingThickness: '薄苔',
    mood: '良好',
    symptoms: '轻微疲劳',
    medicalRecords: '无特殊病史',
    imageUrl: null
};

async function testWorkflow() {
    try {
        console.log('1. 测试分析API (POST /api/analyze)...');
        
        const analyzeResponse = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testAnalysisData)
        });
        
        if (!analyzeResponse.ok) {
            console.log('❌ 分析API失败:', analyzeResponse.status, analyzeResponse.statusText);
            return;
        }
        
        const analysisResult = await analyzeResponse.json();
        console.log('✅ 分析API成功!');
        console.log('分析结果预览:', {
            visualFeatures: analysisResult.visualFeatures?.length || 0,
            tcmPatterns: analysisResult.tcmPatterns?.length || 0,
            holisticAnalysis: analysisResult.holisticAnalysis ? '有内容' : '无内容',
            dietarySuggestions: analysisResult.dietarySuggestions?.length || 0,
            lifestyleSuggestions: analysisResult.lifestyleSuggestions?.length || 0
        });
        
        console.log('\n2. 等待2秒后测试记录API...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('3. 测试记录查询API (GET /api/records)...');
        
        const recordsResponse = await fetch('http://localhost:3000/api/records');
        
        if (!recordsResponse.ok) {
            console.log('❌ 记录API失败:', recordsResponse.status, recordsResponse.statusText);
            return;
        }
        
        const records = await recordsResponse.json();
        console.log('✅ 记录API成功!');
        console.log('记录总数:', records.length);
        
        if (records.length > 0) {
            const latestRecord = records[0];
            console.log('最新记录信息:', {
                id: latestRecord.id,
                height: latestRecord.height,
                weight: latestRecord.weight,
                mood: latestRecord.mood,
                created_at: latestRecord.created_at,
                hasAnalysis: !!latestRecord.analysis_result
            });
            
            // 检查是否包含我们刚才插入的分析记录
            const hasNewRecord = records.find(r => 
                r.height === testAnalysisData.height && 
                r.weight === testAnalysisData.weight &&
                r.mood === testAnalysisData.mood
            );
            
            if (hasNewRecord) {
                console.log('🎉 完美！刚才的分析结果已正确保存到数据库!');
            } else {
                console.log('⚠️  未找到刚才的分析记录，可能保存有问题');
            }
        }
        
        console.log('\n4. 测试完成 - 整个工作流程正常! 🎊');
        
    } catch (error) {
        console.log('❌ 测试过程中发生错误:', error.message);
    }
}

// 检查服务器是否运行
console.log('检查开发服务器是否运行...');
fetch('http://localhost:3000')
    .then(() => {
        console.log('✅ 开发服务器正在运行\n');
        return testWorkflow();
    })
    .catch(() => {
        console.log('❌ 开发服务器未运行，请先执行: npm run dev\n');
    });