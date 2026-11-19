import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { createDemoWorkouts, DEFAULT_DEMO_PROFILE } from './demoData';
import type { CoachMessage, UserProfile, WorkoutSession } from '../types/sportiq';

const DEMO_PROFILE_KEY = 'sportiq_demo_profile_v1';
const DEMO_WORKOUTS_KEY = 'sportiq_demo_workouts_v1';
const DEMO_CHAT_KEY = 'sportiq_demo_chat_v1';

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function sanitizeString(str: string, maxLen: number): string {
  return str.trim().slice(0, maxLen);
}

export function loadDemoProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(DEMO_PROFILE_KEY);
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {
    // ignore storage errors
  }
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(DEFAULT_DEMO_PROFILE));
  return { ...DEFAULT_DEMO_PROFILE };
}

export function saveDemoProfile(profile: UserProfile): UserProfile {
  const safe: UserProfile = {
    ...profile,
    displayName: sanitizeString(profile.displayName || 'Demo Athlete', 80),
    workoutGoals: sanitizeString(profile.workoutGoals || '', 300),
    age: Math.min(110, Math.max(10, Math.round(profile.age || 22))),
    weeklyTrainingTarget: Math.min(14, Math.max(1, Math.round(profile.weeklyTrainingTarget || 5))),
    preferredExercises: profile.preferredExercises.slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(safe));
  return safe;
}

export function loadDemoWorkouts(): WorkoutSession[] {
  try {
    const raw = localStorage.getItem(DEMO_WORKOUTS_KEY);
    if (raw) return JSON.parse(raw) as WorkoutSession[];
  } catch {
    // ignore
  }
  const initial = createDemoWorkouts('demo-athlete');
  localStorage.setItem(DEMO_WORKOUTS_KEY, JSON.stringify(initial));
  return initial;
}

export function saveDemoWorkout(session: Omit<WorkoutSession, 'id' | 'createdAt'>): WorkoutSession[] {
  const existing = loadDemoWorkouts();
  const next: WorkoutSession = {
    ...session,
    id: `demo-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...existing];
  localStorage.setItem(DEMO_WORKOUTS_KEY, JSON.stringify(updated));

  // Update demo profile streaks & personal bests
  const profile = loadDemoProfile();
  const today = new Date().toISOString().slice(0, 10);
  if (profile.lastWorkoutDate !== today) {
    profile.dailyStreak = profile.dailyStreak + 1;
    profile.lastWorkoutDate = today;
  }
  if (session.exercise === 'squats') profile.bestSquats = Math.max(profile.bestSquats, session.reps);
  if (session.exercise === 'pushups') profile.bestPushups = Math.max(profile.bestPushups, session.reps);
  if (session.exercise === 'lunges') profile.bestLunges = Math.max(profile.bestLunges, session.reps);
  saveDemoProfile(profile);

  return updated;
}

export function deleteDemoWorkout(id: string): WorkoutSession[] {
  const existing = loadDemoWorkouts();
  const updated = existing.filter((w) => w.id !== id);
  localStorage.setItem(DEMO_WORKOUTS_KEY, JSON.stringify(updated));
  return updated;
}

export function loadDemoChat(): CoachMessage[] {
  try {
    const raw = localStorage.getItem(DEMO_CHAT_KEY);
    if (raw) return JSON.parse(raw) as CoachMessage[];
  } catch {
    // ignore
  }
  return [];
}

export function saveDemoChat(messages: CoachMessage[]) {
  localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(messages.slice(-40)));
}

export function resetAllDemoData(): {
  profile: UserProfile;
  workouts: WorkoutSession[];
  messages: CoachMessage[];
} {
  const profile = { ...DEFAULT_DEMO_PROFILE, lastWorkoutDate: new Date().toISOString().slice(0, 10) };
  const workouts = createDemoWorkouts('demo-athlete');
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(DEMO_WORKOUTS_KEY, JSON.stringify(workouts));
  localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify([]));
  return { profile, workouts, messages: [] };
}

// Firestore operations
export async function ensureFirestoreUserProfile(
  uid: string,
  displayName: string,
  email?: string | null
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        age: data.age,
        fitnessLevel: data.fitnessLevel,
        preferredExercises: data.preferredExercises,
        workoutGoals: data.workoutGoals,
        weeklyTrainingTarget: data.weeklyTrainingTarget,
        dailyStreak: data.dailyStreak,
        lastWorkoutDate: data.lastWorkoutDate,
        bestSquats: data.bestSquats,
        bestPushups: data.bestPushups,
        bestLunges: data.bestLunges,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
      };
    }

    const cleanName = sanitizeString(displayName || 'Athlete', 80);
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      uid,
      displayName: cleanName,
      email: sanitizeString(email || '', 160),
      age: 24,
      fitnessLevel: 'intermediate',
      preferredExercises: ['Squats', 'Push-ups', 'Lunges'],
      workoutGoals: 'Build consistent movement quality across strength and conditioning workouts.',
      weeklyTrainingTarget: 4,
      dailyStreak: 0,
      lastWorkoutDate: '',
      bestSquats: 0,
      bestPushups: 0,
      bestLunges: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, payload);

    return {
      ...payload,
      lastWorkoutDate: today,
      fitnessLevel: 'intermediate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateFirestoreUserProfile(
  uid: string,
  updates: Pick<
    UserProfile,
    'displayName' | 'email' | 'age' | 'fitnessLevel' | 'preferredExercises' | 'workoutGoals' | 'weeklyTrainingTarget'
  >
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      displayName: sanitizeString(updates.displayName || 'Athlete', 80),
      email: sanitizeString(updates.email || '', 160),
      age: Math.min(110, Math.max(10, Math.round(updates.age || 24))),
      fitnessLevel: updates.fitnessLevel,
      preferredExercises:
        updates.preferredExercises.length > 0 ? updates.preferredExercises.slice(0, 10) : ['Squats'],
      workoutGoals: sanitizeString(updates.workoutGoals || '', 300),
      weeklyTrainingTarget: Math.min(14, Math.max(1, Math.round(updates.weeklyTrainingTarget || 4))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function saveFirestoreWorkout(
  uid: string,
  profile: UserProfile,
  session: Omit<WorkoutSession, 'id' | 'createdAt' | 'userId'>
): Promise<void> {
  const workoutsCol = collection(db, 'users', uid, 'workouts');
  try {
    await addDoc(workoutsCol, {
      userId: uid,
      exercise: session.exercise,
      reps: Math.min(5000, Math.max(0, Math.round(session.reps))),
      incompleteReps: Math.min(5000, Math.max(0, Math.round(session.incompleteReps))),
      durationSeconds: Math.min(86400, Math.max(0, Math.round(session.durationSeconds))),
      performanceScore: Math.min(100, Math.max(0, Math.round(session.performanceScore))),
      avgConfidence: Math.min(1, Math.max(0, Number(session.avgConfidence))),
      feedbackSummary: sanitizeString(session.feedbackSummary || 'Workout completed.', 500),
      formNotes: session.formNotes.slice(0, 10).map((n) => sanitizeString(n, 200)),
      minAngle: Math.min(180, Math.max(0, Number(session.minAngle))),
      maxAngle: Math.min(180, Math.max(0, Number(session.maxAngle))),
      avgAlignment: Math.min(100, Math.max(0, Number(session.avgAlignment))),
      isDemo: Boolean(session.isDemo),
      createdAt: serverTimestamp(),
    });

    const today = new Date().toISOString().slice(0, 10);
    const nextStreak = profile.lastWorkoutDate === today ? profile.dailyStreak : profile.dailyStreak + 1;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      dailyStreak: Math.min(3650, nextStreak),
      lastWorkoutDate: today,
      bestSquats:
        session.exercise === 'squats' ? Math.max(profile.bestSquats, session.reps) : profile.bestSquats,
      bestPushups:
        session.exercise === 'pushups' ? Math.max(profile.bestPushups, session.reps) : profile.bestPushups,
      bestLunges:
        session.exercise === 'lunges' ? Math.max(profile.bestLunges, session.reps) : profile.bestLunges,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/workouts`);
  }
}

export async function deleteFirestoreWorkout(uid: string, workoutId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', uid, 'workouts', workoutId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/workouts/${workoutId}`);
  }
}

export async function saveFirestoreCoachMessage(
  uid: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(db, 'users', uid, 'coachMessages'), {
      userId: uid,
      role,
      content: sanitizeString(content, 4000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/coachMessages`);
  }
}

export function subscribeFirestoreUser(
  uid: string,
  onProfile: (p: UserProfile) => void,
  onWorkouts: (w: WorkoutSession[]) => void,
  onMessages: (m: CoachMessage[]) => void
): () => void {
  const unsubProfile = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onProfile({
          uid: d.uid,
          displayName: d.displayName,
          email: d.email,
          age: d.age,
          fitnessLevel: d.fitnessLevel,
          preferredExercises: d.preferredExercises,
          workoutGoals: d.workoutGoals,
          weeklyTrainingTarget: d.weeklyTrainingTarget,
          dailyStreak: d.dailyStreak,
          lastWorkoutDate: d.lastWorkoutDate,
          bestSquats: d.bestSquats,
          bestPushups: d.bestPushups,
          bestLunges: d.bestLunges,
          createdAt: toIsoString(d.createdAt),
          updatedAt: toIsoString(d.updatedAt),
        });
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
  );

  const qWorkouts = query(collection(db, 'users', uid, 'workouts'), orderBy('createdAt', 'desc'));
  const unsubWorkouts = onSnapshot(
    qWorkouts,
    (snap) => {
      const list: WorkoutSession[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId,
          exercise: d.exercise,
          reps: d.reps,
          incompleteReps: d.incompleteReps,
          durationSeconds: d.durationSeconds,
          performanceScore: d.performanceScore,
          avgConfidence: d.avgConfidence,
          feedbackSummary: d.feedbackSummary,
          formNotes: d.formNotes ?? [],
          minAngle: d.minAngle,
          maxAngle: d.maxAngle,
          avgAlignment: d.avgAlignment,
          isDemo: Boolean(d.isDemo),
          createdAt: toIsoString(d.createdAt),
        };
      });
      onWorkouts(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/workouts`)
  );

  const qMsgs = query(collection(db, 'users', uid, 'coachMessages'), orderBy('createdAt', 'asc'));
  const unsubMsgs = onSnapshot(
    qMsgs,
    (snap) => {
      const msgs: CoachMessage[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId,
          role: d.role,
          content: d.content,
          createdAt: toIsoString(d.createdAt),
        };
      });
      onMessages(msgs);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/coachMessages`)
  );

  return () => {
    unsubProfile();
    unsubWorkouts();
    unsubMsgs();
  };
}
