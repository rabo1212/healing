
export enum RecoveryStage {
  EARLY = '수술 초기 (0-1개월)',
  MIDDLE = '수술 중기 (1-6개월)',
  LATE = '수술 후기 (6-12개월)'
}

export interface FoodLog {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  menuName: string;
  description: string;
  photoUrl?: string;
  timestamp: number;
}

export interface Recipe {
  id: string;
  title: string;
  stage: RecoveryStage;
  ingredients: string[];
  steps: string[];
  tip: string;
  image: string;
}

export interface MedicalTip {
  title: string;
  content: string;
  category: '영양' | '생활습관' | '주의사항';
}
