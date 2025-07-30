-- 第一步：检查现有的records表结构
-- 在Supabase Dashboard -> SQL Editor中先执行这个查询

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 如果上面的查询显示表存在但字段不全，请继续执行下面的ALTER语句

-- 第二步：添加缺少的字段
-- 一个一个添加，避免重复字段错误

-- 添加基本信息字段
DO $$
BEGIN
    -- 添加height字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='height') THEN
        ALTER TABLE public.records ADD COLUMN height INTEGER;
    END IF;
    
    -- 添加weight字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='weight') THEN
        ALTER TABLE public.records ADD COLUMN weight NUMERIC(5,2);
    END IF;
    
    -- 添加舌诊相关字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='tongue_body_color') THEN
        ALTER TABLE public.records ADD COLUMN tongue_body_color TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='tongue_shape') THEN
        ALTER TABLE public.records ADD COLUMN tongue_shape TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='tongue_coating_color') THEN
        ALTER TABLE public.records ADD COLUMN tongue_coating_color TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='tongue_coating_thickness') THEN
        ALTER TABLE public.records ADD COLUMN tongue_coating_thickness TEXT;
    END IF;
    
    -- 添加其他字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='mood') THEN
        ALTER TABLE public.records ADD COLUMN mood TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='symptoms') THEN
        ALTER TABLE public.records ADD COLUMN symptoms TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='medical_records') THEN
        ALTER TABLE public.records ADD COLUMN medical_records TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='image_url') THEN
        ALTER TABLE public.records ADD COLUMN image_url TEXT;
    END IF;
    
    -- 添加analysis_result字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='analysis_result') THEN
        ALTER TABLE public.records ADD COLUMN analysis_result JSONB;
    END IF;
    
    -- 添加created_at字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='created_at') THEN
        ALTER TABLE public.records ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- 确保id字段存在并且是主键
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='records' AND column_name='id') THEN
        ALTER TABLE public.records ADD COLUMN id BIGSERIAL PRIMARY KEY;
    END IF;
    
END $$;

-- 第三步：创建索引
CREATE INDEX IF NOT EXISTS idx_records_created_at ON public.records (created_at DESC);

-- 第四步：验证表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 第五步：插入测试数据
INSERT INTO public.records (
    height, 
    weight, 
    tongue_body_color, 
    tongue_shape, 
    tongue_coating_color, 
    tongue_coating_thickness,
    mood,
    symptoms,
    analysis_result
) VALUES (
    170,
    65.5,
    '淡红色',
    '正常',
    '白苔',
    '薄苔',
    '良好',
    '表结构修复测试',
    '{"test": true, "message": "表结构修复成功"}'::jsonb
);

-- 第六步：查询验证
SELECT * FROM public.records ORDER BY created_at DESC LIMIT 5;