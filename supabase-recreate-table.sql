-- 备选方案：完全重新创建records表
-- ⚠️ 警告：这会删除现有数据！

-- 删除现有表（如果存在）
DROP TABLE IF EXISTS public.records CASCADE;

-- 重新创建完整的records表
CREATE TABLE public.records (
    id BIGSERIAL PRIMARY KEY,
    height INTEGER,
    weight NUMERIC(5,2),
    tongue_body_color TEXT,
    tongue_shape TEXT,
    tongue_coating_color TEXT,
    tongue_coating_thickness TEXT,
    mood TEXT,
    symptoms TEXT,
    medical_records TEXT,
    image_url TEXT,
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_records_created_at ON public.records (created_at DESC);

-- 插入测试数据
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
    '重新创建表测试',
    '{"test": true, "message": "表重新创建成功"}'::jsonb
);

-- 验证
SELECT * FROM public.records;