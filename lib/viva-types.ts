export type VivaRole = 'examiner' | 'candidate' | 'system';

export type VivaDiscipline =
  | 'phd_thesis_defense'
  | 'medical_viva'
  | 'law_oral_exam'
  | 'engineering_defense'
  | 'mba_capstone'
  | 'professional_board'
  | 'custom';

export type VivaDifficulty = 'firm' | 'stern' | 'brutal';

export type VivaModelId =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant';

export interface VivaTurn {
  id: string;
  role: VivaRole;
  text: string;
  timestamp: number;
  interrupted?: boolean;
}

export interface VivaPersonaConfig {
  id: string;
  name: string;
  background: string;
  specialization?: string;
  institution?: string;
}

export interface VivaSessionConfig {
  discipline: VivaDiscipline;
  topic: string;
  difficulty: VivaDifficulty;
  candidateName?: string;
  examinerName?: string;
  allowInterruptions: boolean;
  persona?: VivaPersonaConfig;
  model?: VivaModelId;
}

export interface VivaRubricScores {
  clarity: number;
  depth: number;
  defensibility: number;
  composure: number;
  timeManagement: number;
}

export interface VivaSession {
  id: string;
  config: VivaSessionConfig;
  turns: VivaTurn[];
  createdAt: number;
  endedAt?: number;
  verdict?: string;
  rubricScores?: VivaRubricScores;
}

export interface VivaFlashcard { q: string; a: string; }

export interface VivaStudyMaterials {
  id: string;
  sessionId: string;
  flashcards: VivaFlashcard[];
  outline: string;
  recommendations: string[];
  createdAt: number;
}

export const VIVA_MODEL_LABELS: Record<VivaModelId, string> = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B (recommended)',
  'llama-3.1-8b-instant':    'Llama 3.1 8B (faster)',
};

export const VIVA_DISCIPLINE_LABELS: Record<VivaDiscipline, string> = {
  phd_thesis_defense:  'PhD Thesis Defense',
  medical_viva:        'Medical Viva (Clinical)',
  law_oral_exam:       'Law Oral Exam',
  engineering_defense: 'Engineering Project Defense',
  mba_capstone:        'MBA Capstone Defense',
  professional_board:  'Professional Board Interview',
  custom:              'Custom / Other',
};

export const VIVA_DIFFICULTY_LABELS: Record<VivaDifficulty, string> = {
  firm:   'Firm — fair but probing',
  stern:  'Stern — classic viva tone',
  brutal: 'Brutal — defend or fall',
};
