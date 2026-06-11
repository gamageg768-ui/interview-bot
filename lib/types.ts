export type InterviewType =
  | 'technical' | 'behavioral' | 'system-design' | 'hr'
  | 'school-admissions' | 'university-admissions' | 'scholarship'
  | 'club' | 'sports' | 'volunteer' | 'custom'
  | 'presentation';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const TYPE_LABELS: Record<InterviewType, string> = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  'system-design': 'System Design',
  hr: 'HR / Culture',
  'school-admissions': 'School Admissions',
  'university-admissions': 'University',
  scholarship: 'Scholarship',
  club: 'Club / Org',
  sports: 'Sports',
  volunteer: 'Volunteer',
  custom: 'Custom',
  presentation: 'Presentation',
};

export interface InterviewConfig {
  type: InterviewType;
  role: string;
  context: string;
  difficulty: Difficulty;
  questionCount: number;
}

export interface Question {
  id: number;
  question: string;
  category: string;
  hints: string[];
  expectedTopics: string[];
}

export interface AnswerFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  overallFeedback: string;
}

export interface SessionQuestion {
  question: Question;
  answer: string;
  feedback: AnswerFeedback;
  timeSpent: number;
}

export interface CoachingReport {
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  studyTopics: string[];
  nextSteps: string[];
  predictedScore: number;
}

export interface PlanDay {
  day: number;
  focus: string;
  type: InterviewType;
  difficulty: Difficulty;
  count: number;
  tip: string;
}

export interface ResumeProfile {
  name: string;
  currentRole: string;
  skills: string[];
  experienceSummary: string;
}

export interface PresentationAssessment {
  structureScore: number;
  contentDepthScore: number;
  clarityScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  verdict: string;
}

// Feature 4 — Email Templates
export type EmailTemplateType = 'thank-you' | 'follow-up' | 'withdrawal' | 'counter-offer' | 'acceptance';
export interface EmailContext {
  interviewerName: string;
  companyName: string;
  role: string;
  yourName: string;
  additionalContext?: string;
}

// Feature 6 — Answer Quality Metrics
export interface AnswerMetrics {
  wordCount: number;
  estimatedSpeakingTimeSec: number;
  topicCoveragePercent: number;
  structureScore: number;
}

// Feature 9 — Salary Negotiation
export interface NegotiationScenario {
  role: string;
  company: string;
  offeredSalary: number;
  targetSalary: number;
  yearsExperience: number;
}
export interface NegotiationTurn {
  role: 'user' | 'recruiter';
  message: string;
}
export interface NegotiationResponse {
  aiMessage: string;
  isComplete: boolean;
  finalOffer?: number;
}

export interface SavedSession {
  id: string;
  type: string;
  role: string;
  context: string;
  difficulty: string;
  totalQuestions: number;
  averageScore: number;
  completedAt: string;
  answers: {
    id: string;
    question: string;
    userAnswer: string;
    score: number;
    feedback: string;
  }[];
}
