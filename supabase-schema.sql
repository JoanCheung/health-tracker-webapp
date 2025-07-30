-- 创建health tracker的records表
-- 在Supabase Dashboard -> SQL Editor中执行此脚本

CREATE TABLE IF NOT EXISTS public.records (
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

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_records_created_at ON public.records (created_at DESC);

-- 启用行级安全性（可选，根据需要）
-- ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- 插入一条测试数据来验证表结构
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
    '测试记录',
    '{"test": true, "message": "表结构创建成功"}'::jsonb
);

-- 查询验证
SELECT * FROM public.records ORDER BY created_at DESC LIMIT 1;