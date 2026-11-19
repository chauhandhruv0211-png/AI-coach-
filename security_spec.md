# SportIQ AI Firestore Security Specification

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. A `WorkoutSession` at `/users/{userId}/workouts/{workoutId}` cannot exist unless the parent `/users/{userId}` profile exists, and `userId` in the document equals `request.auth.uid`.
3. A `CoachMessage` at `/users/{userId}/coachMessages/{messageId}` cannot exist unless the parent `/users/{userId}` profile exists, and `userId` in the document equals `request.auth.uid`.
4. All `createdAt` and `updatedAt` timestamps must match `request.time`.
5. `uid`, `userId`, and `createdAt` are immutable after creation.
6. All string lengths, numeric ranges, and array sizes (`preferredExercises.size() <= 10`, `formNotes.size() <= 10`) are strictly bounded.

## 2. Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write to `/users/uid1`.
2. Authenticated user `uid2` reading `/users/uid1`.
3. Authenticated user creating `/users/uid1` with `uid: "uid2"` (identity spoofing).
4. Authenticated user creating `/users/uid1` with extra ghost field `isAdmin: true` (shadow field injection).
5. Unverified email (`email_verified: false`) attempting to create `/users/uid1`.
6. Client injecting forged `createdAt` timestamp instead of `request.time`.
7. Client updating immutable `createdAt` or `uid` on `/users/uid1`.
8. Oversized `workoutGoals` (> 300 chars) or `displayName` (> 80 chars) (resource poisoning).
9. Oversized document ID (> 128 chars or invalid characters) on `/users/{userId}/workouts/{workoutId}`.
10. Creating a workout session with `exercise: "deadlift"` (outside allowlist `['squats', 'pushups', 'lunges']`).
11. Creating a workout session with `performanceScore: 999` or negative `reps: -5`.
12. `preferredExercises` array with > 10 items or non-string first element.
