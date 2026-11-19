import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDuration, formatExerciseLabel } from '../lib/demoData';
import type { ExerciseType, WorkoutSession } from '../types/sportiq';

interface AnalyticsViewProps {
  workouts: WorkoutSession[];
  isDemoMode: boolean;
}

type RangeDays = 7 | 30 | 90;
type ExerciseFilter = 'all' | ExerciseType;

export function AnalyticsView({ workouts, isDemoMode }: AnalyticsViewProps) {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [exerciseFilter, setExerciseFilter] = useState<ExerciseFilter>('all');

  const filteredWorkouts = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    return workouts
      .filter((w) => new Date(w.createdAt).getTime() >= cutoff)
      .filter((w) => (exerciseFilter === 'all' ? true : w.exercise === exerciseFilter))
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [workouts, rangeDays, exerciseFilter]);

  const hasSampleData = useMemo(
    () => isDemoMode || filteredWorkouts.some((w) => w.isDemo),
    [isDemoMode, filteredWorkouts]
  );

  const progressionData = useMemo(() => {
    return filteredWorkouts.map((w) => ({
      date: new Date(w.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      exercise: formatExerciseLabel(w.exercise),
      reps: w.reps,
      score: w.performanceScore,
      durationMin: Number((w.durationSeconds / 60).toFixed(1)),
      alignment: w.avgAlignment,
    }));
  }, [filteredWorkouts]);

  const exerciseBreakdown = useMemo(() => {
    const map: Record<ExerciseType, { name: string; sessions: number; reps: number; scoreSum: number }> = {
      squats: { name: 'Squats', sessions: 0, reps: 0, scoreSum: 0 },
      pushups: { name: 'Push-ups', sessions: 0, reps: 0, scoreSum: 0 },
      lunges: { name: 'Lunges', sessions: 0, reps: 0, scoreSum: 0 },
    };
    for (const w of filteredWorkouts) {
      map[w.exercise].sessions += 1;
      map[w.exercise].reps += w.reps;
      map[w.exercise].scoreSum += w.performanceScore;
    }
    return Object.values(map).map((item) => ({
      name: item.name,
      sessions: item.sessions,
      reps: item.reps,
      avgScore: item.sessions > 0 ? Math.round(item.scoreSum / item.sessions) : 0,
    }));
  }, [filteredWorkouts]);

  const summary = useMemo(() => {
    const count = filteredWorkouts.length;
    const reps = filteredWorkouts.reduce((s, w) => s + w.reps, 0);
    const duration = filteredWorkouts.reduce((s, w) => s + w.durationSeconds, 0);
    const avgScore =
      count > 0 ? Math.round(filteredWorkouts.reduce((s, w) => s + w.performanceScore, 0) / count) : 0;
    const activeDays = new Set(filteredWorkouts.map((w) => w.createdAt.slice(0, 10))).size;
    return { count, reps, duration, avgScore, activeDays };
  }, [filteredWorkouts]);

  return (
    <div className="space-y-6">
      {/* Filter Controls Bar */}
      <div className="glass-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1">Timeframe:</span>
          {([7, 30, 90] as RangeDays[]).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rangeDays === days
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1">Exercise:</span>
          {(['all', 'squats', 'pushups', 'lunges'] as ExerciseFilter[]).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExerciseFilter(ex)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                exerciseFilter === ex
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {ex === 'all' ? 'All Exercises' : formatExerciseLabel(ex)}
            </button>
          ))}
        </div>
      </div>

      {hasSampleData && (
        <div className="text-xs text-sky-300/90 px-1">
          Showing analytics computed from your saved workouts {isDemoMode ? '(Demo Mode includes preloaded sample data)' : ''}.
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-400">Sessions ({rangeDays}d)</div>
          <div className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
            {summary.count}
          </div>
        </div>
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-400">Total Repetitions</div>
          <div className="font-mono text-2xl font-semibold text-sky-400 tabular-nums mt-1">
            {summary.reps}
          </div>
        </div>
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-400">Avg Form Score</div>
          <div className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums mt-1">
            {summary.avgScore} / 100
          </div>
        </div>
        <div className="glass-surface rounded-2xl p-5">
          <div className="text-xs text-slate-400">Active Time &amp; Days</div>
          <div className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
            {formatDuration(summary.duration)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
            {summary.activeDays} active days
          </div>
        </div>
      </div>

      {filteredWorkouts.length === 0 ? (
        <div className="glass-surface rounded-2xl p-12 text-center text-sm text-slate-400">
          No workouts recorded in this timeframe for the selected filter.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chart 1: Repetition Progression */}
          <div className="glass-surface rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">Repetition Progression</h3>
            <p className="text-xs text-slate-400 mb-4">Valid repetitions per completed session</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1222',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reps"
                    name="Repetitions"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#repsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Performance Score & Alignment Trend */}
          <div className="glass-surface rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">
              Performance Score &amp; Posture Consistency
            </h3>
            <p className="text-xs text-slate-400 mb-4">Movement quality trend across sessions</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1222',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Performance Score"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#22c55e' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="alignment"
                    name="Posture Alignment %"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Workout Duration */}
          <div className="glass-surface rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">Workout Duration (Minutes)</h3>
            <p className="text-xs text-slate-400 mb-4">Active tracking time per session</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1222',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Bar dataKey="durationMin" name="Minutes" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Exercise Distribution */}
          <div className="glass-surface rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">Exercise Volume Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4">Total repetitions &amp; avg score by movement</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseBreakdown} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1222',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Bar dataKey="reps" name="Total Reps" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgScore" name="Avg Score" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
