import { GoogleGenAI } from "@google/genai";

export async function checkFoodSafety(foodName: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  
  if (!apiKey) {
    return { status: 'error', message: 'API 키가 설정되지 않았습니다.', tip: 'Vercel 환경변수를 확인해주세요.' };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `당신은 위암 부분절제 수술을 받은 환자를 돕는 전문 영양사입니다.
      '${foodName}'을(를) 먹어도 되는지 분석해주세요.
      
      반드시 아래 JSON 형식으로만 답변하세요:
      {"status": "safe" 또는 "caution" 또는 "avoid", "message": "설명", "tip": "팁"}
      
      - safe: 먹어도 됨
      - caution: 주의해서 먹어야 함  
      - avoid: 피해야 함`,
    });

    if (response && response.text) {
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        return { status: 'unknown', message: response.text, tip: '담당 의료진과 상담하세요.' };
      }
    }
    
    return { status: 'error', message: '결과를 가져올 수 없습니다.', tip: '다시 시도해주세요.' };
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message?.includes("API key")) {
      return { status: 'error', message: 'API 키가 올바르지 않습니다.', tip: 'Vercel 환경변수를 확인해주세요.' };
    }
    
    return { status: 'error', message: '서버 오류가 발생했습니다.', tip: '잠시 후 다시 시도해주세요.' };
  }
}
