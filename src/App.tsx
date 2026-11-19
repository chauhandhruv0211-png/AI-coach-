import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { AICoachView } from './components/AICoachView';
import { AnalyticsView } from './components/AnalyticsView';
import { AppShell } from './components/AppShell';
import { AuthPage } from './components/AuthPage';
import { DashboardView } from './components/DashboardView';
import { DailyReminderBanner } from './components/DailyReminderBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HistoryView } from './components/HistoryView';
import { LandingPage } from './components/LandingPage';
import { LivePoseView } from './components/LivePoseView';
import { ProfileView } from './components/ProfileView';
import { computeAchievementBadges, computeStats, DEFAULT_DEMO_PROFILE } from './lib/demoData';
import { auth } from './lib/firebase';
import {
  deleteDemoWorkout,
  deleteFirestoreWorkout,
  ensureFirestoreUserProfile,
  loadDemoChat,
  loadDemoProfile,
  loadDemoWorkouts,
  resetAllDemoData,
  saveDemoChat,
  saveDemoProfile,
  saveDemoWorkout,
  saveFirestoreCoachMessage,
  saveFirestoreWorkout,
  subscribeFirestoreUser,
  updateFirestoreUserProfile,
} from './lib/store';
import type {
  AppPage,
  CoachMessage,
  ExerciseType,
  FitnessLevel,
  UserProfile,
  WorkoutSession,
} from './types/sportiq';

function SportIQApp() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [page, setPage] = useState<AppPage>('landing');

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_DEMO_PROFILE);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squats');
  const [pendingCoachPrompt, setPendingCoachPrompt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sportiq_reminder_enabled');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [dismissedDateKey, setDismissedDateKey] = useState<string>(() => {
    try {
      return localStorage.getItem('sportiq_reminder_dismissed_date') || '';
    } catch {
      return '';
    }
  });
  const [previewReminder, setPreviewReminder] = useState(false);

  // Re-evaluate local time every 60s so 6:00 PM triggers automatically
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      setFirebaseUser(user);
      if (user) {
        setIsDemoMode(false);
        try {
          const initialProfile = await ensureFirestoreUserProfile(
            user.uid,
            user.displayName || 'Athlete',
            user.email
          );
          setProfile(initialProfile);
          unsubFirestore = subscribeFirestoreUser(
            user.uid,
            (nextProfile) => setProfile(nextProfile),
            (nextWorkouts) => setWorkouts(nextWorkouts),
            (nextMsgs) => setMessages(nextMsgs)
          );
          setPage((prev) => (prev === 'landing' || prev === 'auth' ? 'dashboard' : prev));
        } catch (err) {
          console.error('Failed to sync Firestore profile:', err);
        }
      }
      setAuthReady(true);
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const enterDemoMode = (
    targetPage: AppPage = 'dashboard',
    customName?: string,
    level?: FitnessLevel
  ) => {
    let demoProfile = loadDemoProfile();
    if (customName || level) {
      demoProfile = saveDemoProfile({
        ...demoProfile,
        displayName: customName || demoProfile.displayName,
        fitnessLevel: level || demoProfile.fitnessLevel,
      });
    }
    setProfile(demoProfile);
    setWorkouts(loadDemoWorkouts());
    setMessages(loadDemoChat());
    setIsDemoMode(true);
    setPage(targetPage);
  };

  const handleResetDemo = () => {
    const reset = resetAllDemoData();
    setProfile(reset.profile);
    setWorkouts(reset.workouts);
    setMessages(reset.messages);
    setStatusMessage('Demo data reset to clean baseline.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSignOut = async () => {
    if (firebaseUser) {
      await signOut(auth);
      setFirebaseUser(null);
    }
    setIsDemoMode(false);
    setPage('landing');
  };

  const handleSaveWorkout = async (
    session: Omit<WorkoutSession, 'id' | 'createdAt' | 'userId'>
  ) => {
    const previousEarnedIds = new Set(
      computeAchievementBadges(profile, workouts)
        .filter((b) => b.earned)
        .map((b) => b.id)
    );

    if (firebaseUser && !isDemoMode) {
      await saveFirestoreWorkout(firebaseUser.uid, profile, session);
    } else {
      const updated = saveDemoWorkout({ ...session, userId: profile.uid });
      const nextProfile = loadDemoProfile();
      setWorkouts(updated);
      setProfile(nextProfile);

      const newlyUnlocked = computeAchievementBadges(nextProfile, updated).filter(
        (b) => b.earned && !previousEarnedIds.has(b.id)
      );
      if (newlyUnlocked.length > 0) {
        setStatusMessage(
          `Achievement Unlocked: ${newlyUnlocked.map((b) => b.title).join(', ')}`
        );
        setTimeout(() => setStatusMessage(null), 5000);
      }
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (firebaseUser && !isDemoMode) {
      await deleteFirestoreWorkout(firebaseUser.uid, id);
    } else {
      setWorkouts(deleteDemoWorkout(id));
    }
  };

  const handleSaveProfile = async (
    updates: Pick<
      UserProfile,
      | 'displayName'
      | 'email'
      | 'age'
      | 'fitnessLevel'
      | 'preferredExercises'
      | 'workoutGoals'
      | 'weeklyTrainingTarget'
    >
  ) => {
    if (firebaseUser && !isDemoMode) {
      await updateFirestoreUserProfile(firebaseUser.uid, updates);
    } else {
      const next = saveDemoProfile({ ...profile, ...updates });
      setProfile(next);
    }
  };

  const handleAppendMessages = async (
    newMsgs: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => {
    if (firebaseUser && !isDemoMode) {
      for (const m of newMsgs) {
        await saveFirestoreCoachMessage(firebaseUser.uid, m.role, m.content);
      }
    } else {
      const next: CoachMessage[] = [
        ...messages,
        ...newMsgs.map((m, idx) => ({
          id: `demo-msg-${Date.now()}-${idx}`,
          userId: profile.uid,
          role: m.role,
          content: m.content,
          createdAt: new Date().toISOString(),
        })),
      ];
      setMessages(next);
      saveDemoChat(next);
    }
  };

  const handleStartExercise = (ex: ExerciseType) => {
    setSelectedExercise(ex);
    setPage('live');
  };

  const handleOpenCoachWithTopic = (prompt: string) => {
    setPendingCoachPrompt(prompt);
    setPage('coach');
  };

  const todayDateStr = currentTime.toDateString();
  const todayKey = currentTime.toISOString().slice(0, 10);
  const completedWorkoutToday = workouts.some(
    (w) => new Date(w.createdAt).toDateString() === todayDateStr
  );
  const stats = computeStats(workouts);
  const isPastSixPm = currentTime.getHours() >= 18;
  const shouldShowDailyReminder =
    previewReminder ||
    (reminderEnabled &&
      isPastSixPm &&
      !completedWorkoutToday &&
      stats.workoutsThisWeek < profile.weeklyTrainingTarget &&
      dismissedDateKey !== todayKey);

  useEffect(() => {
    if (
      page !== 'landing' &&
      page !== 'auth' &&
      reminderEnabled &&
      isPastSixPm &&
      !completedWorkoutToday &&
      stats.workoutsThisWeek < profile.weeklyTrainingTarget &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const notifiedKey = `sportiq_notified_${todayKey}`;
      try {
        if (!localStorage.getItem(notifiedKey)) {
          new Notification('SportIQ AI — 6:00 PM Workout Reminder', {
            body: `You haven't logged a workout today (${stats.workoutsThisWeek}/${profile.weeklyTrainingTarget} weekly sessions).`,
          });
          localStorage.setItem(notifiedKey, '1');
        }
      } catch {
        // ignore notification errors
      }
    }
  }, [
    page,
    reminderEnabled,
    isPastSixPm,
    completedWorkoutToday,
    stats.workoutsThisWeek,
    profile.weeklyTrainingTarget,
    todayKey,
  ]);

  const handleToggleReminder = (enabled: boolean) => {
    setReminderEnabled(enabled);
    try {
      localStorage.setItem('sportiq_reminder_enabled', String(enabled));
    } catch {
      // ignore
    }
  };

  const handleDismissReminder = () => {
    setPreviewReminder(false);
    setDismissedDateKey(todayKey);
    try {
      localStorage.setItem('sportiq_reminder_dismissed_date', todayKey);
    } catch {
      // ignore
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#050914] flex items-center justify-center text-slate-300 text-sm">
        Initializing SportIQ AI...
      </div>
    );
  }

  if (page === 'landing') {
    return (
      <LandingPage
        onEnterDemo={() => enterDemoMode('dashboard')}
        onStartLiveDemo={() => {
          setSelectedExercise('squats');
          enterDemoMode('live');
        }}
        onOpenAuth={() => setPage('auth')}
      />
    );
  }

  if (page === 'auth') {
    return (
      <AuthPage
        onBack={() => setPage('landing')}
        onDemoLogin={(name, level) => enterDemoMode('dashboard', name, level)}
        onAuthSuccess={() => setPage('dashboard')}
      />
    );
  }

  return (
    <AppShell
      activePage={page}
      onNavigate={setPage}
      profile={profile}
      isDemoMode={isDemoMode || !firebaseUser}
      onResetDemo={handleResetDemo}
      onSignOut={() => void handleSignOut()}
      photoURL={firebaseUser?.photoURL}
    >
      {statusMessage && (
        <div className="mb-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
          {statusMessage}
        </div>
      )}

      <DailyReminderBanner
        visible={shouldShowDailyReminder && page !== 'live'}
        isPreview={previewReminder}
        workoutsThisWeek={stats.workoutsThisWeek}
        weeklyTarget={profile.weeklyTrainingTarget}
        onStartWorkout={() => {
          setPreviewReminder(false);
          setPage('live');
        }}
        onDismiss={handleDismissReminder}
      />

      {page === 'dashboard' && (
        <DashboardView
          profile={profile}
          workouts={workouts}
          isDemoMode={isDemoMode || !firebaseUser}
          onNavigate={setPage}
          onStartExercise={handleStartExercise}
        />
      )}

      {page === 'live' && (
        <LivePoseView
          initialExercise={selectedExercise}
          profile={profile}
          recentWorkouts={workouts}
          onSaveWorkout={handleSaveWorkout}
          onOpenCoachWithTopic={handleOpenCoachWithTopic}
        />
      )}

      {page === 'coach' && (
        <AICoachView
          profile={profile}
          workouts={workouts}
          messages={messages}
          pendingPrompt={pendingCoachPrompt}
          onClearPendingPrompt={() => setPendingCoachPrompt(null)}
          onAppendMessages={handleAppendMessages}
        />
      )}

      {page === 'analytics' && (
        <AnalyticsView
          workouts={workouts}
          isDemoMode={isDemoMode || !firebaseUser}
        />
      )}

      {page === 'history' && (
        <HistoryView
          workouts={workouts}
          onDeleteWorkout={handleDeleteWorkout}
          onAnalyzeWithCoach={handleOpenCoachWithTopic}
        />
      )}

      {page === 'profile' && (
        <ProfileView
          profile={profile}
          workouts={workouts}
          isDemoMode={isDemoMode || !firebaseUser}
          reminderEnabled={reminderEnabled}
          completedWorkoutToday={completedWorkoutToday}
          onToggleReminder={handleToggleReminder}
          onPreviewReminder={() => {
            setPreviewReminder(true);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('SportIQ AI — 6:00 PM Workout Reminder', {
                body: `Preview: You have completed ${stats.workoutsThisWeek}/${profile.weeklyTrainingTarget} sessions this week.`,
              });
            }
          }}
          onSaveProfile={handleSaveProfile}
          onResetDemo={handleResetDemo}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SportIQApp />
    </ErrorBoundary>
  );
}
