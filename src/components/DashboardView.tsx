import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Award, Camera, Flame, Target, Trophy } from 'lucide-react';
import {
  computeAchievementBadges,
  computeStats,
  formatDuration,
  formatExerciseLabel,
} from '../lib/demoData';
import type { AppPage, ExerciseType, UserProfile, WorkoutSession } from '../types/sportiq';

interface DashboardViewProps {
  profile: UserProfile;
  workouts: WorkoutSession[];
  isDemoMode: boolean;
  onNavigate: (page: AppPage) => void;
  onStartExercise: (exercise: ExerciseType) => void;
}

export function DashboardView({
  profile,
  workouts,
  isDemoMode,
  onNavigate,
  onStartExercise,
}: DashboardViewProps) {
  const stats = useMemo(() => computeStats(workouts), [workouts]);
  const badges = useMemo(() => computeAchievementBadges(profile, workouts), [profile, workouts]);

  const weeklyChartData = useMemo(() => {
    const days: Array<{ dateKey: string; label: string; reps: number; scoreSum: number; count: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dateKey, label, reps: 0, scoreSum: 0, count: 0 });
    }

    for (const w of workouts) {
      const key = w.createdAt.slice(0, 10);
      const bucket = days.find((d) => d.dateKey === key);
      if (bucket) {
        bucket.reps += w.reps;
        bucket.scoreSum += w.performanceScore;
        bucket.count += 1;
      }
    }

    return days.map((d) => ({
      day: d.label,
      reps: d.reps,
      avgScore: d.count > 0 ? Math.round(d.scoreSum / d.count) : 0,
    }));
  }, [workouts]);

  const weeklyProgressPct = Math.min(
    100,
    Math.round((stats.workoutsThisWeek / Math.max(1, profile.weeklyTrainingTarget)) * 100)
  );

  const recentWorkouts = workouts.slice(0, 5);
  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="glass-surface-elevated rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-sky-400">
            {isDemoMode ? 'Hackathon Demo Mode · Sample & Live Telemetry' : 'Synced Athlete Workspace'}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Welcome back, {profile.displayName}
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            {profile.workoutGoals || 'Select an exercise below to launch real-time MediaPipe pose tracking.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onStartExercise('squats')}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            Squats
          </button>
          <button
            type="button"
            onClick={() => onStartExercise('pushups')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Push-ups
          </button>
          <button
            type="button"
            onClick={() => onStartExercise('lunges')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Lunges
          </button>
        </div>
      </section>

      {/* Primary KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Total Workouts Completed</div>
          <div className="font-mono text-3xl font-semibold text-white tabular-nums mt-2">
            {stats.totalWorkouts}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            {stats.workoutsThisWeek} completed in last 7 days
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Total Repetitions</div>
          <div className="font-mono text-3xl font-semibold text-sky-400 tabular-nums mt-2">
            {stats.totalReps}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            Verified full-range movements
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Average Performance Score</div>
          <div className="font-mono text-3xl font-semibold text-emerald-400 tabular-nums mt-2">
            {stats.avgScore}
            <span className="text-base text-slate-400 font-normal"> / 100</span>
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            Posture alignment &amp; depth consistency
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Total Workout Duration</div>
          <div className="font-mono text-3xl font-semibold text-white tabular-nums mt-2">
            {formatDuration(stats.totalDurationSeconds)}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            Active time under pose tracking
          </div>
        </div>
      </section>

      {/* Weekly Activity + Gamification Progress */}
      <section className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-surface rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="text-base font-semibold text-white">Weekly Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily verified repetitions across the last 7 days {isDemoMode ? '(includes sample demo data)' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
            >
              Full Analytics
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#0b1222',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Bar dataKey="reps" name="Repetitions" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gamification & Personal Progress */}
        <div className="lg:col-span-4 glass-surface rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Personal Progress</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Daily Streak
                </div>
                <div className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
                  {profile.dailyStreak} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  Badges
                </div>
                <div className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums mt-1">
                  {earnedBadges.length}
                  <span className="text-xs font-normal text-slate-400"> / {badges.length}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-sky-400" />
                  Weekly Goal
                </span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {stats.workoutsThisWeek} / {profile.weeklyTrainingTarget} sessions
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${weeklyProgressPct}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Personal Best Records (Single Set)
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-900/70 border border-slate-800 py-2 px-1">
                  <div className="text-[11px] text-slate-400">Squats</div>
                  <div className="font-mono text-base font-semibold text-white tabular-nums">
                    {profile.bestSquats}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/70 border border-slate-800 py-2 px-1">
                  <div className="text-[11px] text-slate-400">Push-ups</div>
                  <div className="font-mono text-base font-semibold text-white tabular-nums">
                    {profile.bestPushups}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/70 border border-slate-800 py-2 px-1">
                  <div className="text-[11px] text-slate-400">Lunges</div>
                  <div className="font-mono text-base font-semibold text-white tabular-nums">
                    {profile.bestLunges}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('coach')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Ask AI Workout Coach
          </button>
        </div>
      </section>

      {/* Recent Workout History */}
      <section className="glass-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Workout History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest pose-analyzed sessions and movement scores
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
          >
            View All Sessions
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentWorkouts.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-400">No workouts recorded yet.</p>
            <button
              type="button"
              onClick={() => onNavigate('live')}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Record Your First Session
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Exercise</th>
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Reps</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Duration</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Score</th>
                  <th className="py-2.5 font-medium hidden md:table-cell">Feedback Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {recentWorkouts.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-800/35 transition-colors">
                    <td className="py-3 pr-4 font-medium text-white whitespace-nowrap">
                      {formatExerciseLabel(session.exercise)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-sky-400 tabular-nums">
                      {session.reps}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-300 tabular-nums">
                      {formatDuration(session.durationSeconds)}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-mono font-semibold tabular-nums ${
                        session.performanceScore >= 90
                          ? 'text-emerald-400'
                          : session.performanceScore >= 75
                          ? 'text-sky-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {session.performanceScore}
                    </td>
                    <td className="py-3 text-xs text-slate-300 hidden md:table-cell max-w-md truncate">
                      {session.feedbackSummary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
