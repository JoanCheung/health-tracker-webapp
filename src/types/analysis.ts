export interface AnalysisResult {
  visualFeatures: string[];
  tcmPatterns: string[];
  holisticAnalysis: string;
  dietarySuggestions: string[];
  lifestyleSuggestions: string[];
  importantNote: string;
}

export interface AnalysisError {
  error: string;
}

export type AnalysisResponse = AnalysisResult | AnalysisError;

// Type guard functions
export function isAnalysisError(analysis: AnalysisResponse): analysis is AnalysisError {
  return 'error' in analysis;
}

export function isAnalysisResult(analysis: AnalysisResponse): analysis is AnalysisResult {
  return 'visualFeatures' in analysis;
}

export interface QuestionData {
  questionText: string;
  options: string[];
  allowMultiple?: boolean;
}