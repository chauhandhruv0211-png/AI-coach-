export type ExerciseType = 'squats' | 'pushups' | 'lunges';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type AppPage =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'live'
  | 'coach'
  | 'analytics'
  | 'history'
  | 'profile';

export type PosePhase = 'READY' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export interface ExerciseThresholds {
  topAngle: number;
  bottomAngle: number;
  alignmentTolerance: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  age: number;
  fitnessLevel: FitnessLevel;
  preferredExercises: string[];
  workoutGoals: string;
  weeklyTrainingTarget: number;
  dailyStreak: number;
  lastWorkoutDate: string;
  bestSquats: number;
  bestPushups: number;
  bestLunges: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  exercise: ExerciseType;
  reps: number;
  incompleteReps: number;
  durationSeconds: number;
  performanceScore: number;
  avgConfidence: number;
  feedbackSummary: string;
  formNotes: string[];
  minAngle: number;
  maxAngle: number;
  avgAlignment: number;
  isDemo: boolean;
  createdAt: string;
}

export interface CoachMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AIInsights {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextSessionPlan: string;
  recoveryNote: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progressText: string;
  progressPercent: number;
  category: 'milestone' | 'volume' | 'streak' | 'form';
  tier: 'bronze' | 'silver' | 'gold';
  iconKey: 'trophy' | 'flame' | 'zap' | 'target' | 'shield' | 'layers' | 'award';
}
