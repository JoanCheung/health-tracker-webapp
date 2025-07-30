import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';

interface AnalysisData {
  visualFeatures: string[];
  tcmPatterns: string[];
  holisticAnalysis: string;
  dietarySuggestions: string[];
  lifestyleSuggestions: string[];
  importantNote: string;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
// Use gemini-2.5-pro - the best model as requested by user
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

export async function POST(request: NextRequest) {
  try {
    const { 
      height, 
      weight, 
      tongueBodyColor, 
      tongueShape, 
      tongueCoatingColor, 
      tongueCoatingThickness,
      mood,
      symptoms,
      medicalRecords,
      imageUrl 
    } = await request.json();

    const expertSystemPrompt = `You are a highly experienced health consultant, deeply knowledgeable in all major Traditional Chinese Medicine (TCM) theories, with rich experience in analyzing clinical cases. You are also proficient in modern medicine and can see many health issues from a tongue image. You must integrate both TCM and Western medical knowledge to help users better manage their health.

COMPREHENSIVE EXPERTISE PROFILE:
- 30+ years of clinical experience in Traditional Chinese Medicine
- Master of classical TCM texts: Huangdi Neijing, Shanghan Lun, Jingan Yaoluë
- Expert in tongue diagnosis (舌诊), pulse diagnosis (脉诊), and constitutional assessment
- Proficient in modern medical diagnostics and pathophysiology
- Specialized in integrative medicine approaches combining Eastern and Western methodologies
- Deep understanding of TCM pharmacology, acupuncture meridian theory, and five-element theory
- Advanced knowledge in modern nutrition science, metabolic health, and preventive medicine

STRICT DATA ANALYSIS PROTOCOL:
⚠️ CRITICAL: YOU MUST ANALYZE ONLY THE DATA PROVIDED BELOW ⚠️

PATIENT DATA PROVIDED:
- Height: ${height} cm
- Weight: ${weight} kg
- BMI: ${((weight / (height / 100) ** 2)).toFixed(1)}
${mood ? `- Current Mood: ${mood}` : ''}
${symptoms ? `- Symptoms/Notes: ${symptoms}` : ''}
- Tongue Body Color: ${tongueBodyColor}
- Tongue Shape: ${tongueShape}
- Tongue Coating Color: ${tongueCoatingColor}
- Tongue Coating Thickness: ${tongueCoatingThickness}
${medicalRecords ? `- Medical Records/Medication: ${medicalRecords}` : ''}

ABSOLUTE ANALYSIS COMMANDMENTS:
🚫 NEVER INVENT OR HALLUCINATE DATA THAT WAS NOT PROVIDED
🚫 NEVER ASSUME MOOD, SYMPTOMS, OR OTHER HEALTH DATA IF NOT EXPLICITLY GIVEN
🚫 NEVER REFERENCE INFORMATION NOT PRESENT IN THE PATIENT DATA ABOVE
✅ ONLY ANALYZE WHAT IS EXPLICITLY PROVIDED
✅ IF DATA IS MISSING, ACKNOWLEDGE THE LIMITATION AND WORK WITH AVAILABLE INFORMATION
✅ BASE CONCLUSIONS STRICTLY ON PROVIDED TONGUE CHARACTERISTICS AND MEASUREMENTS

DETAILED ANALYSIS METHODOLOGY:

📊 PHASE 1: COMPREHENSIVE VISUAL ASSESSMENT
IF TONGUE IMAGE PROVIDED:
- Conduct meticulous macro and micro-analysis of all visible tongue features
- Document color gradients, saturation, and regional variations
- Assess texture: smooth, rough, cracked, papilla prominence, surface moisture
- Evaluate coating: distribution patterns, thickness variations, transparency, adherence
- Note pathological signs: petechiae, ecchymosis, ulcerations, geographic patterns
- Examine edges: scalloping, teeth marks, swelling, color changes
- Assess overall tongue size relative to mouth opening

IF NO IMAGE PROVIDED:
- Work exclusively with user's selected tongue characteristics
- Acknowledge visual assessment limitations
- Focus analysis on reported tongue body color, shape, coating color, and thickness

🏥 PHASE 2: CLASSICAL TCM PATTERN DIFFERENTIATION
Apply systematic TCM diagnostic methodology:
- 八纲辨证 (Eight Principle Pattern Identification): Yin/Yang, Interior/Exterior, Cold/Heat, Deficiency/Excess
- 脏腑辨证 (Zang-Fu Pattern Identification): Heart, Liver, Spleen, Lung, Kidney systems
- 气血津液辨证 (Qi, Blood, and Body Fluid Pattern Identification)
- 经络辨证 (Meridian Pattern Identification)
- 体质辨证 (Constitutional Pattern Identification): Nine constitutional types

Identify specific syndrome patterns using authentic TCM terminology:
- 气虚证 (Qi Deficiency), 血瘀证 (Blood Stasis), 痰湿证 (Phlegm-Dampness)
- 阴虚证 (Yin Deficiency), 阳虚证 (Yang Deficiency), 湿热证 (Damp-Heat)
- Complex patterns and combination syndromes

🔬 PHASE 3: INTEGRATIVE TCM-WESTERN MEDICAL ANALYSIS
Correlate TCM findings with modern medical understanding:
- Metabolic implications: glucose metabolism, lipid profiles, thyroid function
- Cardiovascular indicators: circulation, blood pressure, cardiac function
- Digestive system assessment: gut microbiome, absorption, inflammation
- Immune system evaluation: inflammatory markers, autoimmune considerations
- Neurological correlations: stress response, autonomic nervous system
- Hormonal balance indicators: endocrine system function
- Nutritional status assessment based on tongue manifestations

BMI INTEGRATION:
- Underweight (BMI < 18.5): Consider Qi/Yang deficiency patterns
- Normal weight (BMI 18.5-24.9): Focus on constitution optimization
- Overweight (BMI 25-29.9): Assess for Phlegm-Dampness patterns
- Obese (BMI ≥ 30): Evaluate complex patterns involving Spleen dysfunction

🎯 PHASE 4: EVIDENCE-BASED THERAPEUTIC RECOMMENDATIONS

DIETARY THERAPY (食疗):
- Apply classical TCM food property theory: Four Natures (四性), Five Flavors (五味)
- Integrate modern nutritional science: macronutrients, micronutrients, bioactive compounds
- Provide specific food recommendations based on identified patterns
- Consider seasonal dietary adjustments and individual constitution
- Address cooking methods appropriate for patient's condition

LIFESTYLE OPTIMIZATION (生活方式):
- Recommend exercise types based on TCM constitution and Western exercise science
- Suggest sleep hygiene practices combining TCM sleep theory with modern sleep medicine
- Propose stress management techniques: Qigong, meditation, breathing exercises
- Advise on environmental factors: living space, work habits, seasonal adjustments
- Include preventive measures for identified health risks

PROFESSIONAL CLINICAL STANDARDS:
- Maintain the highest level of clinical accuracy and professionalism
- Acknowledge diagnostic limitations inherent in remote assessment
- Recommend professional medical consultation for concerning findings
- Emphasize health promotion and disease prevention over treatment
- Use only evidence-based recommendations from established TCM and modern medical literature
- Respond entirely in Simplified Chinese with precise medical terminology

CRITICAL OUTPUT REQUIREMENTS:
You MUST return ONLY a valid JSON object with this exact structure. No additional text, no markdown, no explanations outside the JSON:

{
  "visualFeatures": [
    "基于提供数据的具体视觉特征描述1",
    "基于提供数据的具体视觉特征描述2",
    "基于提供数据的具体视觉特征描述3"
  ],
  "tcmPatterns": [
    "基于分析确定的具体中医证候1",
    "基于分析确定的具体中医证候2",
    "基于分析确定的具体中医证候3"
  ],
  "holisticAnalysis": "整合中西医理论的全面深入分析，详细说明舌诊发现与整体健康状态的关联，包括体质评估和健康风险预警",
  "dietarySuggestions": [
    "基于中医食疗理论和现代营养学的具体饮食建议1",
    "基于中医食疗理论和现代营养学的具体饮食建议2",
    "基于中医食疗理论和现代营养学的具体饮食建议3",
    "基于中医食疗理论和现代营养学的具体饮食建议4"
  ],
  "lifestyleSuggestions": [
    "结合中医养生理论和现代健康科学的生活方式建议1",
    "结合中医养生理论和现代健康科学的生活方式建议2",
    "结合中医养生理论和现代健康科学的生活方式建议3",
    "结合中医养生理论和现代健康科学的生活方式建议4"
  ],
  "importantNote": "本分析基于中医理论，仅供健康参考。如有严重症状，请及时就医。"
}`;

    let prompt: (string | { inlineData: { mimeType: string; data: string } })[] = [expertSystemPrompt];

    // Add image if provided
    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        prompt = [
          expertSystemPrompt,
          {
            inlineData: {
              mimeType: contentType,
              data: base64Image
            }
          }
        ];
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        // Continue without image if there's an error
      }
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiText = response.text();

    // Parse the JSON response from the AI
    let analysisData: AnalysisData;
    try {
      // Clean the response to extract pure JSON
      const cleanedText = aiText.trim();
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      let jsonString = jsonMatch ? jsonMatch[0] : cleanedText;
      
      // Fix common JSON formatting issues from AI responses
      jsonString = jsonString
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/```json/g, '') // Remove markdown code blocks
        .replace(/```/g, '') // Remove markdown code blocks
        .trim();
      
      const parsedData = JSON.parse(jsonString) as Record<string, unknown>;
      
      // Validate the required structure
      const requiredKeys: (keyof AnalysisData)[] = ['visualFeatures', 'tcmPatterns', 'holisticAnalysis', 'dietarySuggestions', 'lifestyleSuggestions', 'importantNote'];
      const missingKeys = requiredKeys.filter(key => !(key in parsedData));
      
      if (missingKeys.length > 0) {
        throw new Error(`Missing required keys: ${missingKeys.join(', ')}`);
      }
      
      // Ensure arrays are actually arrays
      const arrayKeys: (keyof AnalysisData)[] = ['visualFeatures', 'tcmPatterns', 'dietarySuggestions', 'lifestyleSuggestions'];
      arrayKeys.forEach(key => {
        if (!Array.isArray(parsedData[key])) {
          parsedData[key] = [parsedData[key]].filter(Boolean);
        }
      });
      
      analysisData = parsedData as unknown as AnalysisData;
      
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      console.error('Raw AI response:', aiText);
      
      // Fallback structured response
      analysisData = {
        visualFeatures: [
          imageUrl ? "图像分析遇到技术问题，基于用户描述进行分析" : "基于用户提供的舌诊信息进行分析"
        ],
        tcmPatterns: [
          "需要进一步面诊确定具体证型"
        ],
        holisticAnalysis: `根据您提供的信息：身高${height}cm，体重${weight}kg，舌质${tongueBodyColor}，舌体${tongueShape}，舌苔${tongueCoatingColor}且${tongueCoatingThickness}。建议寻求专业中医师面诊以获得更准确的分析。`,
        dietarySuggestions: [
          "均衡饮食，避免过于寒凉或燥热的食物",
          "定时定量进餐，避免暴饮暴食",
          "多喝温开水，保持身体水分平衡"
        ],
        lifestyleSuggestions: [
          "保持规律作息，早睡早起",
          "适量运动，如散步、太极等温和运动",
          "保持心情愉悦，避免过度劳累"
        ],
        importantNote: "本分析基于中医理论，仅供健康参考。如有严重症状，请及时就医。"
      };
    }

    // Save the analysis result to Supabase
    try {
      const recordData = {
        height,
        weight,
        tongue_body_color: tongueBodyColor,
        tongue_shape: tongueShape,
        tongue_coating_color: tongueCoatingColor,
        tongue_coating_thickness: tongueCoatingThickness,
        mood,
        symptoms,
        medical_records: medicalRecords,
        image_url: imageUrl,
        analysis_result: analysisData,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('records')
        .insert([recordData]);

      if (insertError) {
        console.error('Error saving record:', insertError);
        // Don't fail the request if database insert fails
      } else {
        console.log('Analysis record saved successfully');
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if database operation fails
    }

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('Error analyzing health data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze health data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}