import { Bell, Camera, X } from 'lucide-react';

interface DailyReminderBannerProps {
  visible: boolean;
  isPreview: boolean;
  workoutsThisWeek: number;
  weeklyTarget: number;
  onStartWorkout: () => void;
  onDismiss: () => void;
}

export function DailyReminderBanner({
  visible,
  isPreview,
  workoutsThisWeek,
  weeklyTarget,
  onStartWorkout,
  onDismiss,
}: DailyReminderBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-white">
            Daily 6:00 PM Workout Reminder{isPreview ? ' (Preview)' : ''}
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed">
            You haven&apos;t logged a workout today toward your weekly target (
            <span className="font-mono tabular-nums font-semibold">
              {workoutsThisWeek} / {weeklyTarget}
            </span>{' '}
            sessions). Complete a quick set of squats, push-ups, or lunges to keep your streak
            moving.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onStartWorkout}
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          Start Quick Session
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss daily reminder"
          className="p-2 rounded-xl border border-amber-500/30 text-amber-200 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
