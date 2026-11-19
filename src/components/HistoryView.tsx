import { useMemo, useState } from 'react';
import { Bot, GitCompare, Search, Trash2 } from 'lucide-react';
import { formatDuration, formatExerciseLabel } from '../lib/demoData';
import type { ExerciseType, WorkoutSession } from '../types/sportiq';

interface HistoryViewProps {
  workouts: WorkoutSession[];
  onDeleteWorkout: (id: string) => Promise<void>;
  onAnalyzeWithCoach: (prompt: string) => void;
}

export function HistoryView({
  workouts,
  onDeleteWorkout,
  onAnalyzeWithCoach,
}: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState<'all' | ExerciseType>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workouts.filter((w) => {
      if (exerciseFilter !== 'all' && w.exercise !== exerciseFilter) return false;
      if (!q) return true;
      return (
        formatExerciseLabel(w.exercise).toLowerCase().includes(q) ||
        w.feedbackSummary.toLowerCase().includes(q)
      );
    });
  }, [workouts, search, exerciseFilter]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedSessions = useMemo(
    () => compareIds.map((id) => workouts.find((w) => w.id === id)).filter(Boolean) as WorkoutSession[],
    [compareIds, workouts]
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteWorkout(id);
      setCompareIds((prev) => prev.filter((item) => item !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="glass-surface rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions by exercise or feedback..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'squats', 'pushups', 'lunges'] as const).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExerciseFilter(ex)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                exerciseFilter === ex
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {ex === 'all' ? 'All' : formatExerciseLabel(ex)}
            </button>
          ))}
        </div>
      </div>

      {/* Session Comparison Drawer */}
      {comparedSessions.length === 2 && (
        <div className="glass-surface-elevated rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <GitCompare className="w-4 h-4 text-sky-400" />
              Side-by-Side Session Comparison
            </div>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Comparison
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {comparedSessions.map((s, idx) => (
              <div
                key={s.id}
                className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Session {idx + 1}: {formatExerciseLabel(s.exercise)}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {new Date(s.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">Reps</div>
                    <div className="font-mono text-lg font-semibold text-sky-400 tabular-nums">
                      {s.reps}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Score</div>
                    <div className="font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                      {s.performanceScore}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Duration</div>
                    <div className="font-mono text-sm font-semibold text-white tabular-nums mt-1">
                      {formatDuration(s.durationSeconds)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Alignment</div>
                    <div className="font-mono text-lg font-semibold text-white tabular-nums">
                      {s.avgAlignment}%
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-300">{s.feedbackSummary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="glass-surface rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-slate-400">
            Select up to 2 sessions using the Compare toggle to inspect progress side-by-side.
          </div>
          <div className="font-mono text-xs text-slate-400 tabular-nums">
            {filtered.length} sessions
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No matching workout sessions found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((session) => {
              const isSelected = compareIds.includes(session.id);
              return (
                <div
                  key={session.id}
                  className={`rounded-xl border p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/40'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="text-sm font-semibold text-white">
                        {formatExerciseLabel(session.exercise)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {new Date(session.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {session.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400">Sample / Sim</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {session.feedbackSummary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 shrink-0">
                    <div className="flex items-center gap-5 text-right">
                      <div>
                        <div className="text-[11px] text-slate-400">Reps</div>
                        <div className="font-mono text-base font-semibold text-sky-400 tabular-nums">
                          {session.reps}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Duration</div>
                        <div className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                          {formatDuration(session.durationSeconds)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Score</div>
                        <div
                          className={`font-mono text-base font-semibold tabular-nums ${
                            session.performanceScore >= 90
                              ? 'text-emerald-400'
                              : session.performanceScore >= 75
                              ? 'text-sky-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {session.performanceScore}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCompare(session.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500 text-slate-950 border-sky-500 font-semibold'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Compare'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onAnalyzeWithCoach(
                            `Review my ${formatExerciseLabel(session.exercise)} session from ${new Date(
                              session.createdAt
                            ).toLocaleDateString()}: ${session.reps} reps, ${
                              session.incompleteReps
                            } incomplete reps, ${session.performanceScore}/100 score, ${
                              session.avgAlignment
                            }% alignment. Summary: ${session.feedbackSummary}`
                          )
                        }
                        title="Ask AI Coach about this session"
                        className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        <Bot className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === session.id}
                        onClick={() => void handleDelete(session.id)}
                        title="Delete workout session"
                        className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
