import type { AchievementBadge, UserProfile, WorkoutSession } from '../types/sportiq';

export const DEFAULT_DEMO_PROFILE: UserProfile = {
  uid: 'demo-athlete',
  displayName: 'Alex Rivera',
  email: 'demo@sportiq.ai',
  age: 22,
  fitnessLevel: 'intermediate',
  preferredExercises: ['Squats', 'Push-ups', 'Lunges'],
  workoutGoals: 'Achieve consistent 95+ form score across 25-rep squat and push-up sets.',
  weeklyTrainingTarget: 5,
  dailyStreak: 4,
  lastWorkoutDate: new Date().toISOString().slice(0, 10),
  bestSquats: 28,
  bestPushups: 22,
  bestLunges: 20,
};

function daysAgoIso(days: number, hourOffset = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hourOffset, 15, 0, 0);
  return d.toISOString();
}

export function createDemoWorkouts(userId = 'demo-athlete'): WorkoutSession[] {
  return [
    {
      id: 'demo-w-1',
      userId,
      exercise: 'squats',
      reps: 24,
      incompleteReps: 1,
      durationSeconds: 195,
      performanceScore: 92,
      avgConfidence: 0.95,
      feedbackSummary: 'Strong parallel squat depth with steady torso posture across 24 valid repetitions.',
      formNotes: ['Consistent depth and alignment maintained across multiple reps.', '1 shallow rep detected near fatigue.'],
      minAngle: 88,
      maxAngle: 174,
      avgAlignment: 93,
      isDemo: true,
      createdAt: daysAgoIso(0, 9),
    },
    {
      id: 'demo-w-2',
      userId,
      exercise: 'pushups',
      reps: 18,
      incompleteReps: 2,
      durationSeconds: 142,
      performanceScore: 87,
      avgConfidence: 0.91,
      feedbackSummary: 'Solid elbow lockout and core plank line; focus on full chest descent on final reps.',
      formNotes: ['Try maintaining a straighter back.', 'Clean full-range repetition completed.'],
      minAngle: 82,
      maxAngle: 169,
      avgAlignment: 88,
      isDemo: true,
      createdAt: daysAgoIso(1, 18),
    },
    {
      id: 'demo-w-3',
      userId,
      exercise: 'lunges',
      reps: 20,
      incompleteReps: 1,
      durationSeconds: 176,
      performanceScore: 90,
      avgConfidence: 0.93,
      feedbackSummary: 'Controlled split-stance deceleration and balanced lead knee alignment.',
      formNotes: ['Good posture!', 'Keep your knees aligned.'],
      minAngle: 94,
      maxAngle: 171,
      avgAlignment: 91,
      isDemo: true,
      createdAt: daysAgoIso(2, 11),
    },
    {
      id: 'demo-w-4',
      userId,
      exercise: 'squats',
      reps: 28,
      incompleteReps: 0,
      durationSeconds: 224,
      performanceScore: 95,
      avgConfidence: 0.96,
      feedbackSummary: 'Personal best squat volume with zero incomplete repetitions and 95% alignment.',
      formNotes: ['Consistent depth and alignment maintained across multiple reps.'],
      minAngle: 85,
      maxAngle: 176,
      avgAlignment: 95,
      isDemo: true,
      createdAt: daysAgoIso(4, 17),
    },
    {
      id: 'demo-w-5',
      userId,
      exercise: 'pushups',
      reps: 22,
      incompleteReps: 1,
      durationSeconds: 168,
      performanceScore: 89,
      avgConfidence: 0.92,
      feedbackSummary: 'Personal best push-up set; crisp tempo through the first 16 repetitions.',
      formNotes: ['Clean full-range repetition completed.'],
      minAngle: 84,
      maxAngle: 167,
      avgAlignment: 89,
      isDemo: true,
      createdAt: daysAgoIso(6, 8),
    },
    {
      id: 'demo-w-6',
      userId,
      exercise: 'lunges',
      reps: 16,
      incompleteReps: 2,
      durationSeconds: 150,
      performanceScore: 84,
      avgConfidence: 0.89,
      feedbackSummary: 'Steady tempo; slight forward torso lean observed on fatigued reps.',
      formNotes: ['Try maintaining a straighter back.'],
      minAngle: 99,
      maxAngle: 168,
      avgAlignment: 84,
      isDemo: true,
      createdAt: daysAgoIso(10, 16),
    },
    {
      id: 'demo-w-7',
      userId,
      exercise: 'squats',
      reps: 20,
      incompleteReps: 2,
      durationSeconds: 170,
      performanceScore: 85,
      avgConfidence: 0.91,
      feedbackSummary: 'Good hip hinge initiation; cue knees outward during ascent.',
      formNotes: ['Keep your knees aligned.'],
      minAngle: 91,
      maxAngle: 172,
      avgAlignment: 86,
      isDemo: true,
      createdAt: daysAgoIso(16, 10),
    },
    {
      id: 'demo-w-8',
      userId,
      exercise: 'pushups',
      reps: 15,
      incompleteReps: 3,
      durationSeconds: 130,
      performanceScore: 81,
      avgConfidence: 0.90,
      feedbackSummary: 'Baseline upper-body calibration set; aim for deeper elbow flexion.',
      formNotes: ['Incomplete depth detected — reach full target angle before returning.'],
      minAngle: 92,
      maxAngle: 164,
      avgAlignment: 83,
      isDemo: true,
      createdAt: daysAgoIso(24, 15),
    },
  ];
}

export function computeStats(workouts: WorkoutSession[]) {
  const totalWorkouts = workouts.length;
  const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);
  const totalDurationSeconds = workouts.reduce((sum, w) => sum + w.durationSeconds, 0);
  const avgScore =
    totalWorkouts > 0
      ? Math.round(workouts.reduce((sum, w) => sum + w.performanceScore, 0) / totalWorkouts)
      : 0;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const workoutsThisWeek = workouts.filter((w) => new Date(w.createdAt).getTime() >= sevenDaysAgo).length;

  return {
    totalWorkouts,
    totalReps,
    totalDurationSeconds,
    avgScore,
    workoutsThisWeek,
  };
}

export function computeAchievementBadges(
  profile: UserProfile,
  workouts: WorkoutSession[]
): AchievementBadge[] {
  const stats = computeStats(workouts);
  const highFormSessions = workouts.filter((w) => w.performanceScore >= 90).length;
  const exercisesCovered = new Set(workouts.map((w) => w.exercise)).size;
  const targetSessions = Math.max(1, profile.weeklyTrainingTarget);

  return [
    {
      id: 'first-session',
      title: 'First Workout Success',
      description: 'Complete your first AI pose-tracked workout session.',
      earned: stats.totalWorkouts >= 1,
      progressText: `${Math.min(stats.totalWorkouts, 1)} / 1 session`,
      progressPercent: Math.min(100, stats.totalWorkouts >= 1 ? 100 : 0),
      category: 'milestone',
      tier: 'bronze',
      iconKey: 'trophy',
    },
    {
      id: 'century-reps',
      title: '100 Reps Completed',
      description: 'Reach 100 verified full-range repetitions across workouts.',
      earned: stats.totalReps >= 100,
      progressText: `${Math.min(stats.totalReps, 100)} / 100 reps`,
      progressPercent: Math.min(100, Math.round((stats.totalReps / 100) * 100)),
      category: 'volume',
      tier: 'silver',
      iconKey: 'zap',
    },
    {
      id: 'seven-day-streak',
      title: '7-Day Streak',
      description: 'Train consistently for 7 consecutive days.',
      earned: profile.dailyStreak >= 7,
      progressText: `${Math.min(profile.dailyStreak, 7)} / 7 days`,
      progressPercent: Math.min(100, Math.round((profile.dailyStreak / 7) * 100)),
      category: 'streak',
      tier: 'gold',
      iconKey: 'flame',
    },
    {
      id: 'precision-form',
      title: 'Biomechanics Precision',
      description: 'Score 90 or higher in 3 analyzed sessions.',
      earned: highFormSessions >= 3,
      progressText: `${Math.min(highFormSessions, 3)} / 3 sessions`,
      progressPercent: Math.min(100, Math.round((highFormSessions / 3) * 100)),
      category: 'form',
      tier: 'silver',
      iconKey: 'shield',
    },
    {
      id: 'tri-discipline',
      title: 'Triple Discipline',
      description: 'Complete Squats, Push-ups, and Lunges.',
      earned: exercisesCovered >= 3,
      progressText: `${exercisesCovered} / 3 exercises`,
      progressPercent: Math.min(100, Math.round((exercisesCovered / 3) * 100)),
      category: 'milestone',
      tier: 'silver',
      iconKey: 'layers',
    },
    {
      id: 'weekly-target',
      title: 'Weekly Target Hit',
      description: 'Meet your configured weekly workout target.',
      earned: stats.workoutsThisWeek >= targetSessions,
      progressText: `${Math.min(stats.workoutsThisWeek, targetSessions)} / ${targetSessions} this week`,
      progressPercent: Math.min(100, Math.round((stats.workoutsThisWeek / targetSessions) * 100)),
      category: 'streak',
      tier: 'gold',
      iconKey: 'target',
    },
    {
      id: 'quarter-k-reps',
      title: '250 Reps Endurance',
      description: 'Accumulate 250 verified full-range repetitions.',
      earned: stats.totalReps >= 250,
      progressText: `${Math.min(stats.totalReps, 250)} / 250 reps`,
      progressPercent: Math.min(100, Math.round((stats.totalReps / 250) * 100)),
      category: 'volume',
      tier: 'gold',
      iconKey: 'award',
    },
  ];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function formatExerciseLabel(exercise: string): string {
  if (exercise === 'pushups') return 'Push-ups';
  if (exercise === 'lunges') return 'Lunges';
  return 'Squats';
}
