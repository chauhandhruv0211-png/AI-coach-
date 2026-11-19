import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  Check,
  Flame,
  Layers,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { computeAchievementBadges, computeStats } from '../lib/demoData';
import type { AchievementBadge, FitnessLevel, UserProfile, WorkoutSession } from '../types/sportiq';

interface ProfileViewProps {
  profile: UserProfile;
  workouts: WorkoutSession[];
  isDemoMode: boolean;
  reminderEnabled: boolean;
  completedWorkoutToday: boolean;
  onToggleReminder: (enabled: boolean) => void;
  onPreviewReminder: () => void;
  onSaveProfile: (
    updates: Pick<
      UserProfile,
      'displayName' | 'email' | 'age' | 'fitnessLevel' | 'preferredExercises' | 'workoutGoals' | 'weeklyTrainingTarget'
    >
  ) => Promise<void>;
  onResetDemo: () => void;
}

const EXERCISE_OPTIONS = ['Squats', 'Push-ups', 'Lunges', 'Running', 'Basketball', 'Cycling'];

export function ProfileView({
  profile,
  workouts,
  isDemoMode,
  reminderEnabled,
  completedWorkoutToday,
  onToggleReminder,
  onPreviewReminder,
  onSaveProfile,
  onResetDemo,
}: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [age, setAge] = useState(profile.age);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(profile.fitnessLevel);
  const [preferredExercises, setPreferredExercises] = useState<string[]>(profile.preferredExercises);
  const [workoutGoals, setWorkoutGoals] = useState(profile.workoutGoals);
  const [weeklyTrainingTarget, setWeeklyTrainingTarget] = useState(profile.weeklyTrainingTarget);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [notificationPermission, setNotificationPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    setDisplayName(profile.displayName);
    setAge(profile.age);
    setFitnessLevel(profile.fitnessLevel);
    setPreferredExercises(profile.preferredExercises);
    setWorkoutGoals(profile.workoutGoals);
    setWeeklyTrainingTarget(profile.weeklyTrainingTarget);
  }, [profile]);

  const badges = useMemo(() => computeAchievementBadges(profile, workouts), [profile, workouts]);
  const stats = useMemo(() => computeStats(workouts), [workouts]);
  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') return badges.filter((b) => b.earned);
    if (badgeFilter === 'locked') return badges.filter((b) => !b.earned);
    return badges;
  }, [badges, badgeFilter]);

  const renderBadgeIcon = (badge: AchievementBadge) => {
    switch (badge.iconKey) {
      case 'trophy':
        return <Trophy className="w-5 h-5" />;
      case 'flame':
        return <Flame className="w-5 h-5" />;
      case 'zap':
        return <Zap className="w-5 h-5" />;
      case 'target':
        return <Target className="w-5 h-5" />;
      case 'shield':
        return <ShieldCheck className="w-5 h-5" />;
      case 'layers':
        return <Layers className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const toggleExercise = (item: string) => {
    setPreferredExercises((prev) => {
      if (prev.includes(item)) {
        return prev.length > 1 ? prev.filter((x) => x !== item) : prev;
      }
      return [...prev, item].slice(0, 10);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onSaveProfile({
        displayName: displayName.trim() || 'Athlete',
        email: profile.email || '',
        age: Math.min(110, Math.max(10, Number(age) || 22)),
        fitnessLevel,
        preferredExercises,
        workoutGoals: workoutGoals.trim(),
        weeklyTrainingTarget: Math.min(14, Math.max(1, Number(weeklyTrainingTarget) || 4)),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left: Editable Profile Form */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="lg:col-span-7 glass-surface rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Athlete Profile &amp; Preferences</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Used by SportIQ AI to personalize workout targets and coaching plans
            </p>
          </div>
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Check className="w-4 h-4" />
              Profile saved
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="prof-age" className="block text-xs font-medium text-slate-300 mb-1.5">
              Age
            </label>
            <input
              id="prof-age"
              type="number"
              min={10}
              max={110}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-level" className="block text-xs font-medium text-slate-300 mb-1.5">
              Fitness Level
            </label>
            <select
              id="prof-level"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="prof-target" className="block text-xs font-medium text-slate-300 mb-1.5">
              Weekly Training Target (Sessions)
            </label>
            <input
              id="prof-target"
              type="number"
              min={1}
              max={14}
              value={weeklyTrainingTarget}
              onChange={(e) => setWeeklyTrainingTarget(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-300 mb-2">
            Preferred Sports &amp; Exercises
          </div>
          <div className="flex flex-wrap gap-2">
            {EXERCISE_OPTIONS.map((item) => {
              const active = preferredExercises.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleExercise(item)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="prof-goals" className="block text-xs font-medium text-slate-300 mb-1.5">
            Workout Goals
          </label>
          <textarea
            id="prof-goals"
            rows={3}
            maxLength={300}
            value={workoutGoals}
            onChange={(e) => setWorkoutGoals(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {isDemoMode && (
            <button
              type="button"
              onClick={onResetDemo}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              Reset Demo Data
            </button>
          )}
        </div>
      </form>

      {/* Right: Streaks, Records & Achievement Badges */}
      <div className="lg:col-span-5 space-y-6">
        <div className="glass-surface-elevated rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">Streaks &amp; Personal Bests</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Flame className="w-4 h-4 text-amber-400" />
                Daily Streak
              </div>
              <div className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
                {profile.dailyStreak} days
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Weekly Goal
              </div>
              <div className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums mt-1">
                {stats.workoutsThisWeek} / {profile.weeklyTrainingTarget}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center pt-1">
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
              <div className="text-xs text-slate-400">Best Squats</div>
              <div className="font-mono text-xl font-semibold text-sky-400 tabular-nums mt-1">
                {profile.bestSquats}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
              <div className="text-xs text-slate-400">Best Push-ups</div>
              <div className="font-mono text-xl font-semibold text-sky-400 tabular-nums mt-1">
                {profile.bestPushups}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
              <div className="text-xs text-slate-400">Best Lunges</div>
              <div className="font-mono text-xl font-semibold text-sky-400 tabular-nums mt-1">
                {profile.bestLunges}
              </div>
            </div>
          </div>
        </div>

        {/* Daily 6:00 PM Workout Reminder Settings */}
        <div className="glass-surface rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-white">Daily 6:00 PM Reminder</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Alerts you after 6:00 PM local time if you have not logged a workout today.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => onToggleReminder(!reminderEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                reminderEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {reminderEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="text-xs text-slate-300 rounded-xl bg-slate-900/70 border border-slate-800 px-3.5 py-2.5">
            Today&apos;s status:{' '}
            <span className={completedWorkoutToday ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
              {completedWorkoutToday
                ? 'Workout logged today (reminder paused until tomorrow).'
                : 'No workout logged yet today (reminder triggers at 6:00 PM).'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  if ('Notification' in window) {
                    const perm = await Notification.requestPermission();
                    setNotificationPermission(perm);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                {notificationPermission === 'denied'
                  ? 'Browser Notifications Blocked'
                  : 'Enable Browser Notifications'}
              </button>
            )}
            <button
              type="button"
              onClick={onPreviewReminder}
              className="px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-200 transition-colors cursor-pointer"
            >
              Preview 6 PM Alert
            </button>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">Achievements</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                {badges.filter((b) => b.earned).length} / {badges.length} badges unlocked
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(['all', 'unlocked', 'locked'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBadgeFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    badgeFilter === tab
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'unlocked' ? 'Unlocked' : 'In Progress'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredBadges.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No badges in this filter yet.
              </div>
            ) : (
              filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-4 flex items-start gap-3.5 transition-colors ${
                    badge.earned
                      ? badge.tier === 'gold'
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : 'bg-emerald-500/10 border-emerald-500/35'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      badge.earned
                        ? badge.tier === 'gold'
                          ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-500'
                    }`}
                  >
                    {badge.earned ? renderBadgeIcon(badge) : <Lock className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{badge.title}</span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          badge.earned ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {badge.earned ? 'Unlocked' : badge.progressText}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{badge.description}</p>

                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            badge.earned
                              ? badge.tier === 'gold'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${badge.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
