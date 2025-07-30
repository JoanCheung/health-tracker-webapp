import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface QuestionObject {
  questionText: string;
  options: string[];
  allowMultiple?: boolean;
}

interface QuestionsResponse {
  questions: QuestionObject[];
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
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

    const tcmDiagnosticianPrompt = `You are a master Traditional Chinese Medicine (TCM) diagnostician with 30+ years of clinical experience. Your ONLY task is to analyze the initial patient data provided below and generate 2-3 highly relevant, multiple-choice clarifying questions that would help refine your TCM diagnosis.

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

CRITICAL INSTRUCTIONS:
1. Analyze the provided data to form preliminary TCM diagnostic impressions
2. Based on your analysis, identify key areas that need clarification for accurate pattern differentiation
3. Generate exactly 3 specific, clinically relevant questions
4. QUESTION TYPES REQUIRED:
   - Question 1: Single-choice question (allowMultiple: false)
   - Question 2: Single-choice question (allowMultiple: false)  
   - Question 3: MUST be multi-select symptoms question (allowMultiple: true) with options like "头脑昏沉不清爽", "小腿容易水肿" etc.
5. Questions should focus on symptoms, feelings, or conditions that would help distinguish between similar TCM patterns
6. Questions should be in Simplified Chinese and use accessible language
7. Focus on the most diagnostically significant areas based on the tongue findings and other provided data

EXAMPLE QUESTION TYPES (but create questions specific to THIS patient's data):
- Sleep patterns and quality
- Digestive symptoms and appetite
- Temperature sensations (cold/heat preferences)
- Emotional states and stress levels
- Menstrual patterns (if applicable)
- Urination and bowel movement patterns
- Pain locations and characteristics
- Seasonal symptom variations

STRICT OUTPUT REQUIREMENT:
You MUST return ONLY a valid JSON object with this exact structure. No additional text, no markdown, no explanations:

{
  "questions": [
    {
      "questionText": "基于患者舌诊特征的具体问题1",
      "options": ["选项1", "选项2", "选项3", "选项4"],
      "allowMultiple": false
    },
    {
      "questionText": "基于患者整体状况的具体问题2", 
      "options": ["选项1", "选项2", "选项3"],
      "allowMultiple": false
    },
    {
      "questionText": "您目前有哪些身体不适症状？（可多选）",
      "options": ["头脑昏沉不清爽", "小腿容易水肿", "容易疲劳乏力", "睡眠质量差", "消化不良", "情绪波动大", "腰膝酸软", "手脚冰凉"],
      "allowMultiple": true
    }
  ]
}`;

    let prompt: (string | { inlineData: { mimeType: string; data: string } })[] = [tcmDiagnosticianPrompt];

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
          tcmDiagnosticianPrompt,
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
    let questionsData: QuestionsResponse;
    try {
      // Clean the response to extract pure JSON
      const cleanedText = aiText.trim();
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : cleanedText;
      
      const parsedData = JSON.parse(jsonString) as Record<string, unknown>;
      
      // Validate the required structure
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid response structure: missing questions array');
      }
      
      // Validate each question object
      parsedData.questions.forEach((question: Record<string, unknown>, index: number) => {
        if (!question.questionText || typeof question.questionText !== 'string') {
          throw new Error(`Invalid question ${index + 1}: missing or invalid questionText`);
        }
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
          throw new Error(`Invalid question ${index + 1}: missing or invalid options array`);
        }
      });
      
      questionsData = parsedData as unknown as QuestionsResponse;
      
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      console.error('Raw AI response:', aiText);
      
      // Fallback structured response
      questionsData = {
        questions: [
          {
            questionText: "您最近的睡眠质量如何？",
            options: ["睡眠良好", "入睡困难", "易醒多梦", "早醒疲劳"],
            allowMultiple: false
          },
          {
            questionText: "您平时怕冷还是怕热？",
            options: ["怕冷", "怕热", "忽冷忽热", "无明显感觉"],
            allowMultiple: false
          },
          {
            questionText: "您目前有哪些身体不适症状？（可多选）",
            options: ["头脑昏沉不清爽", "小腿容易水肿", "容易疲劳乏力", "睡眠质量差", "消化不良", "情绪波动大", "腰膝酸软", "手脚冰凉"],
            allowMultiple: true
          }
        ]
      };
    }

    return NextResponse.json(questionsData);
  } catch (error) {
    console.error('Error generating clarifying questions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate clarifying questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}