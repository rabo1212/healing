
import { GoogleGenAI } from "@google/genai";

export async function checkFoodSafety(foodName: string) {
  // 매 호출 시 인스턴스를 생성하여 최신 API 키를 사용하도록 보장
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `당신은 위암 부분절제 수술을 받은 환자를 돕는 전문 영양사입니다.
      '${foodName}'을(를) 먹어도 되는지 분석해주세요.
      답변은 반드시 친절하고 힙한 한국어로 작성해주세요.
      포함할 내용:
      1. 섭취 가능 여부 (가능/주의/불가)
      2. 위암 회복 단계별 이유 (덤핑 증후군, 소화 부담, 위점막 자극성 등 고려)
      3. 먹으면 안 된다면 추천하는 대체 음식
      의학적으로 검증된 정보를 바탕으로 짧고 명확하게 조언해주세요.`,
      config: {
        systemInstruction: "위암 환자의 안전을 최우선으로 합니다. 덤핑 증후군, 위점막 자극, 소화 불량 가능성을 반드시 체크하여 답변하세요. 1회 섭취량과 조리법에 따른 차이도 언급하면 좋습니다."
      }
    });

    // .text는 메서드가 아니라 속성입니다.
    if (response && response.text) {
      return response.text;
    } else {
      throw new Error("결과 텍스트를 찾을 수 없습니다.");
    }
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    
    // 특정 오류 메시지에 따른 처리
    if (error.message?.includes("Requested entity was not found")) {
      return "모델을 찾을 수 없습니다. 설정된 모델명을 확인해주세요.";
    }
    if (error.message?.includes("API key")) {
      return "API 키가 올바르지 않거나 설정되지 않았습니다.";
    }
    
    return "현재 분석 서버가 바빠요. 잠시 후 다시 시도해주거나, 담당 의사 선생님과 꼭 상의하세요! 힙한 회복을 응원합니다.";
  }
}
