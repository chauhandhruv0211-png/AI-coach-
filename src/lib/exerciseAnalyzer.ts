import type { ExerciseThresholds, ExerciseType, PosePhase } from '../types/sportiq';

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12], // shoulders
  [11, 13],
  [13, 15], // left arm
  [12, 14],
  [14, 16], // right arm
  [11, 23],
  [12, 24], // torso
  [23, 24], // hips
  [23, 25],
  [25, 27], // left leg
  [24, 26],
  [26, 28], // right leg
  [27, 31],
  [28, 32], // feet
  [0, 11],
  [0, 12], // neck/head reference
];

export const DEFAULT_THRESHOLDS: Record<ExerciseType, ExerciseThresholds> = {
  squats: {
    topAngle: 160,
    bottomAngle: 105,
    alignmentTolerance: 24,
  },
  pushups: {
    topAngle: 158,
    bottomAngle: 95,
    alignmentTolerance: 22,
  },
  lunges: {
    topAngle: 158,
    bottomAngle: 108,
    alignmentTolerance: 24,
  },
};

export interface FrameAnalysis {
  phase: PosePhase;
  reps: number;
  incompleteReps: number;
  primaryAngle: number;
  secondaryAngle: number;
  alignmentAngle: number;
  confidence: number;
  alignmentScore: number;
  performanceScore: number;
  feedback: string;
  feedbackTone: 'positive' | 'nominal' | 'caution';
  minAngle: number;
  maxAngle: number;
  avgAlignment: number;
  formNotes: string[];
  landmarksDetected: boolean;
}

export function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}

function avgVisibility(landmarks: PoseLandmark[], indices: number[]): number {
  let sum = 0;
  let count = 0;
  for (const idx of indices) {
    const lm = landmarks[idx];
    if (lm) {
      sum += lm.visibility ?? 0.9;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

function pickBestSide(landmarks: PoseLandmark[], leftIdx: number[], rightIdx: number[]): 'left' | 'right' {
  const leftVis = avgVisibility(landmarks, leftIdx);
  const rightVis = avgVisibility(landmarks, rightIdx);
  return leftVis >= rightVis ? 'left' : 'right';
}

export class ExerciseStateMachine {
  private exercise: ExerciseType;
  private thresholds: ExerciseThresholds;
  private phase: PosePhase = 'READY';
  private reps = 0;
  private incompleteReps = 0;
  private smoothedPrimary = 170;
  private hasInitialAngle = false;
  private reachedBottomInCycle = false;
  private lowestAngleInCycle = 180;
  private alignmentSamples: number[] = [];
  private confidenceSamples: number[] = [];
  private repScores: number[] = [];
  private minObservedAngle = 180;
  private maxObservedAngle = 0;
  private feedback = 'Position your full body in frame to begin.';
  private feedbackTone: 'positive' | 'nominal' | 'caution' = 'nominal';
  private formNotes = new Set<string>();
  private lastFeedbackTime = 0;
  private consecutiveGoodReps = 0;

  constructor(exercise: ExerciseType, thresholds?: ExerciseThresholds) {
    this.exercise = exercise;
    this.thresholds = thresholds ?? { ...DEFAULT_THRESHOLDS[exercise] };
  }

  public setThresholds(thresholds: ExerciseThresholds) {
    this.thresholds = { ...thresholds };
  }

  public reset(exercise?: ExerciseType) {
    if (exercise) {
      this.exercise = exercise;
      this.thresholds = { ...DEFAULT_THRESHOLDS[exercise] };
    }
    this.phase = 'READY';
    this.reps = 0;
    this.incompleteReps = 0;
    this.smoothedPrimary = 170;
    this.hasInitialAngle = false;
    this.reachedBottomInCycle = false;
    this.lowestAngleInCycle = 180;
    this.alignmentSamples = [];
    this.confidenceSamples = [];
    this.repScores = [];
    this.minObservedAngle = 180;
    this.maxObservedAngle = 0;
    this.feedback = 'Position your full body in frame to begin.';
    this.feedbackTone = 'nominal';
    this.formNotes.clear();
    this.lastFeedbackTime = 0;
    this.consecutiveGoodReps = 0;
  }

  public getSnapshot(): FrameAnalysis {
    const avgAlign =
      this.alignmentSamples.length > 0
        ? this.alignmentSamples.reduce((a, b) => a + b, 0) / this.alignmentSamples.length
        : 92;
    const avgConf =
      this.confidenceSamples.length > 0
        ? this.confidenceSamples.reduce((a, b) => a + b, 0) / this.confidenceSamples.length
        : 0;
    const avgRepScore =
      this.repScores.length > 0
        ? this.repScores.reduce((a, b) => a + b, 0) / this.repScores.length
        : avgAlign;

    return {
      phase: this.phase,
      reps: this.reps,
      incompleteReps: this.incompleteReps,
      primaryAngle: Math.round(this.smoothedPrimary),
      secondaryAngle: Math.round(this.smoothedPrimary),
      alignmentAngle: Math.round(avgAlign),
      confidence: Number(avgConf.toFixed(2)),
      alignmentScore: Math.round(avgAlign),
      performanceScore: Math.round(Math.min(100, Math.max(0, avgRepScore))),
      feedback: this.feedback,
      feedbackTone: this.feedbackTone,
      minAngle: this.minObservedAngle === 180 ? 0 : Math.round(this.minObservedAngle),
      maxAngle: Math.round(this.maxObservedAngle),
      avgAlignment: Math.round(avgAlign),
      formNotes: Array.from(this.formNotes).slice(0, 8),
      landmarksDetected: this.confidenceSamples.length > 0,
    };
  }

  public processFrame(landmarks: PoseLandmark[] | null | undefined, nowMs: number): FrameAnalysis {
    if (!landmarks || landmarks.length < 29) {
      return {
        ...this.getSnapshot(),
        landmarksDetected: false,
        feedback: 'No athlete detected. Step back so shoulders, hips, knees, and ankles are visible.',
        feedbackTone: 'caution',
      };
    }

    let rawPrimary = 170;
    let rawSecondary = 170;
    let rawAlignment = 175;
    let frameAlignmentScore = 95;
    let frameConfidence = 0;
    let postureIssue: string | null = null;

    if (this.exercise === 'squats') {
      const side = pickBestSide(landmarks, [11, 23, 25, 27], [12, 24, 26, 28]);
      const shoulder = landmarks[side === 'left' ? 11 : 12];
      const hip = landmarks[side === 'left' ? 23 : 24];
      const knee = landmarks[side === 'left' ? 25 : 26];
      const ankle = landmarks[side === 'left' ? 27 : 28];

      frameConfidence = avgVisibility(landmarks, [11, 12, 23, 24, 25, 26, 27, 28]);
      rawPrimary = calculateAngle(hip, knee, ankle); // knee angle
      rawSecondary = calculateAngle(shoulder, hip, knee); // hip angle

      // Torso upright angle relative to vertical axis
      const verticalRef: PoseLandmark = { x: hip.x, y: hip.y - 0.3 };
      const torsoLean = calculateAngle(verticalRef, hip, shoulder);
      rawAlignment = 180 - torsoLean;

      // Knee alignment check in frontal plane (knee valgus / inward collapse)
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];
      const kneeSpread = Math.abs(leftKnee.x - rightKnee.x);
      const ankleSpread = Math.abs(leftAnkle.x - rightAnkle.x);
      const valgusFlag = ankleSpread > 0.06 && kneeSpread < ankleSpread * 0.72 && rawPrimary < 145;

      const leanExcess = Math.max(0, torsoLean - (26 + this.thresholds.alignmentTolerance * 0.6));
      frameAlignmentScore = Math.max(45, 100 - leanExcess * 1.8 - (valgusFlag ? 18 : 0));

      if (valgusFlag) {
        postureIssue = 'Keep your knees aligned.';
      } else if (torsoLean > 35 + this.thresholds.alignmentTolerance * 0.5 && rawPrimary < 145) {
        postureIssue = 'Try maintaining a straighter back.';
      }
    } else if (this.exercise === 'pushups') {
      const side = pickBestSide(landmarks, [11, 13, 15, 23, 27], [12, 14, 16, 24, 28]);
      const shoulder = landmarks[side === 'left' ? 11 : 12];
      const elbow = landmarks[side === 'left' ? 13 : 14];
      const wrist = landmarks[side === 'left' ? 15 : 16];
      const hip = landmarks[side === 'left' ? 23 : 24];
      const ankle = landmarks[side === 'left' ? 27 : 28];

      frameConfidence = avgVisibility(landmarks, [11, 13, 15, 23, 27]);
      rawPrimary = calculateAngle(shoulder, elbow, wrist); // elbow flexion
      rawSecondary = calculateAngle(shoulder, hip, ankle); // plank body line
      rawAlignment = rawSecondary;

      const plankDeviation = Math.abs(180 - rawSecondary);
      frameAlignmentScore = Math.max(45, 100 - Math.max(0, plankDeviation - 10) * 2.2);

      if (plankDeviation > this.thresholds.alignmentTolerance) {
        postureIssue = 'Try maintaining a straighter back.';
      }
    } else {
      // Lunges
      const leftKneeAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
      const rightKneeAngle = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
      const leadIsLeft = leftKneeAngle <= rightKneeAngle;

      const hip = landmarks[leadIsLeft ? 23 : 24];
      const shoulder = landmarks[leadIsLeft ? 11 : 12];
      const knee = landmarks[leadIsLeft ? 25 : 26];
      const ankle = landmarks[leadIsLeft ? 27 : 28];

      frameConfidence = avgVisibility(landmarks, [11, 12, 23, 24, 25, 26, 27, 28]);
      rawPrimary = Math.min(leftKneeAngle, rightKneeAngle);
      rawSecondary = Math.max(leftKneeAngle, rightKneeAngle);

      const verticalRef: PoseLandmark = { x: hip.x, y: hip.y - 0.3 };
      const torsoLean = calculateAngle(verticalRef, hip, shoulder);
      const kneeOverToeShift = Math.abs(knee.x - ankle.x);
      rawAlignment = 180 - torsoLean;

      const leanPenalty = Math.max(0, torsoLean - this.thresholds.alignmentTolerance) * 1.9;
      const stabilityPenalty = kneeOverToeShift > 0.16 && rawPrimary < 140 ? 14 : 0;
      frameAlignmentScore = Math.max(45, 100 - leanPenalty - stabilityPenalty);

      if (stabilityPenalty > 0) {
        postureIssue = 'Keep your knees aligned.';
      } else if (torsoLean > this.thresholds.alignmentTolerance) {
        postureIssue = 'Try maintaining a straighter back.';
      }
    }

    if (frameConfidence < 0.25) {
      return {
        ...this.getSnapshot(),
        landmarksDetected: false,
        confidence: Number(frameConfidence.toFixed(2)),
        feedback: 'Low landmark visibility. Improve lighting or step into full frame.',
        feedbackTone: 'caution',
      };
    }

    // Smooth angle using EMA to avoid noisy duplicate counts
    if (!this.hasInitialAngle) {
      this.smoothedPrimary = rawPrimary;
      this.hasInitialAngle = true;
    } else {
      this.smoothedPrimary = this.smoothedPrimary * 0.65 + rawPrimary * 0.35;
    }

    const angle = this.smoothedPrimary;
    this.minObservedAngle = Math.min(this.minObservedAngle, angle);
    this.maxObservedAngle = Math.max(this.maxObservedAngle, angle);
    this.alignmentSamples.push(frameAlignmentScore);
    if (this.alignmentSamples.length > 240) this.alignmentSamples.shift();
    this.confidenceSamples.push(frameConfidence);
    if (this.confidenceSamples.length > 120) this.confidenceSamples.shift();

    // State machine transitions
    const { topAngle, bottomAngle } = this.thresholds;
    const descendStartThreshold = topAngle - 12;
    const incompleteCheckThreshold = topAngle - 22;

    if (this.phase === 'READY') {
      if (angle < descendStartThreshold) {
        this.phase = 'DESCENDING';
        this.reachedBottomInCycle = false;
        this.lowestAngleInCycle = angle;
      } else if (postureIssue && nowMs - this.lastFeedbackTime > 1200) {
        this.feedback = postureIssue;
        this.feedbackTone = 'caution';
        this.formNotes.add(postureIssue);
        this.lastFeedbackTime = nowMs;
      }
    } else if (this.phase === 'DESCENDING') {
      this.lowestAngleInCycle = Math.min(this.lowestAngleInCycle, angle);
      if (angle <= bottomAngle) {
        this.phase = 'BOTTOM';
        this.reachedBottomInCycle = true;
        if (!postureIssue) {
          this.feedback = 'Good posture!';
          this.feedbackTone = 'positive';
          this.lastFeedbackTime = nowMs;
        }
      } else if (angle > topAngle - 4 && this.lowestAngleInCycle < incompleteCheckThreshold) {
        // Returned to top without hitting bottom depth
        this.incompleteReps += 1;
        this.phase = 'READY';
        this.repScores.push(Math.max(45, Math.round(frameAlignmentScore * 0.65)));
        this.feedback = 'Complete the movement.';
        this.feedbackTone = 'caution';
        this.formNotes.add('Incomplete depth detected — reach full target angle before returning.');
        this.consecutiveGoodReps = 0;
        this.lastFeedbackTime = nowMs;
      } else if (postureIssue && nowMs - this.lastFeedbackTime > 1000) {
        this.feedback = postureIssue;
        this.feedbackTone = 'caution';
        this.formNotes.add(postureIssue);
        this.lastFeedbackTime = nowMs;
      }
    } else if (this.phase === 'BOTTOM') {
      this.lowestAngleInCycle = Math.min(this.lowestAngleInCycle, angle);
      if (angle > bottomAngle + 10) {
        this.phase = 'ASCENDING';
      }
    } else if (this.phase === 'ASCENDING') {
      if (angle <= bottomAngle) {
        this.phase = 'BOTTOM';
      } else if (angle >= topAngle - 4) {
        if (this.reachedBottomInCycle) {
          this.reps += 1;
          this.consecutiveGoodReps += 1;
          const depthBonus = this.lowestAngleInCycle <= bottomAngle - 5 ? 4 : 0;
          const repScore = Math.min(100, Math.round(frameAlignmentScore * 0.85 + 15 + depthBonus));
          this.repScores.push(repScore);

          if (postureIssue) {
            this.feedback = postureIssue;
            this.feedbackTone = 'caution';
            this.formNotes.add(postureIssue);
          } else if (this.consecutiveGoodReps >= 3) {
            this.feedback = 'Your movement is becoming more consistent.';
            this.feedbackTone = 'positive';
            this.formNotes.add('Consistent depth and alignment maintained across multiple reps.');
          } else {
            this.feedback = 'Excellent repetition!';
            this.feedbackTone = 'positive';
            this.formNotes.add('Clean full-range repetition completed.');
          }
          this.lastFeedbackTime = nowMs;
        }
        this.phase = 'READY';
        this.reachedBottomInCycle = false;
        this.lowestAngleInCycle = 180;
      }
    }

    const snap = this.getSnapshot();
    return {
      ...snap,
      primaryAngle: Math.round(angle),
      secondaryAngle: Math.round(rawSecondary),
      alignmentAngle: Math.round(rawAlignment),
      alignmentScore: Math.round(frameAlignmentScore),
      confidence: Number(frameConfidence.toFixed(2)),
      landmarksDetected: true,
    };
  }
}

/**
 * Generates biomechanically realistic 33-landmark frames for Demo Simulation mode
 * so judges can evaluate the exact MediaPipe skeleton overlay, angle telemetry,
 * incomplete rep detection, and posture feedback without needing a webcam.
 */
export function generateSyntheticLandmarks(exercise: ExerciseType, elapsedMs: number): PoseLandmark[] {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.96,
  }));

  const cycleDuration = 2800;
  const cycleIndex = Math.floor(elapsedMs / cycleDuration);
  const t = (elapsedMs % cycleDuration) / cycleDuration;
  // Smooth down-and-up movement curve (0 at top, 1 at bottom)
  const rawPhase = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
  // Every 4th rep is slightly shallow so judges see incomplete-rep detection work!
  const isShallowDemoRep = cycleIndex % 4 === 3;
  const depth = rawPhase * (isShallowDemoRep ? 0.42 : 1.0);
  // Every 3rd rep introduces slight posture cue for demonstration
  const postureSway = cycleIndex % 3 === 2 ? Math.sin(t * Math.PI) * 0.045 : 0;

  if (exercise === 'squats') {
    const hipY = 0.50 + depth * 0.21;
    const shoulderY = 0.25 + depth * 0.23 + postureSway * 0.4;
    const shoulderXShift = postureSway * 1.1;
    const kneeValgus = cycleIndex % 3 === 1 ? depth * 0.032 : 0;

    landmarks[0] = { x: 0.5 + shoulderXShift, y: shoulderY - 0.11, visibility: 0.98 }; // nose
    landmarks[11] = { x: 0.43 + shoulderXShift, y: shoulderY, visibility: 0.98 };
    landmarks[12] = { x: 0.57 + shoulderXShift, y: shoulderY, visibility: 0.98 };
    landmarks[13] = { x: 0.39 + shoulderXShift, y: shoulderY + 0.12, visibility: 0.95 };
    landmarks[14] = { x: 0.61 + shoulderXShift, y: shoulderY + 0.12, visibility: 0.95 };
    landmarks[15] = { x: 0.43 + shoulderXShift, y: shoulderY + 0.18 - depth * 0.08, visibility: 0.92 };
    landmarks[16] = { x: 0.57 + shoulderXShift, y: shoulderY + 0.18 - depth * 0.08, visibility: 0.92 };

    landmarks[23] = { x: 0.44, y: hipY, visibility: 0.99 };
    landmarks[24] = { x: 0.56, y: hipY, visibility: 0.99 };
    landmarks[25] = { x: 0.41 + kneeValgus, y: 0.68 - depth * 0.02, visibility: 0.98 };
    landmarks[26] = { x: 0.59 - kneeValgus, y: 0.68 - depth * 0.02, visibility: 0.98 };
    landmarks[27] = { x: 0.41, y: 0.88, visibility: 0.97 };
    landmarks[28] = { x: 0.59, y: 0.88, visibility: 0.97 };
    landmarks[31] = { x: 0.39, y: 0.91, visibility: 0.94 };
    landmarks[32] = { x: 0.61, y: 0.91, visibility: 0.94 };
  } else if (exercise === 'pushups') {
    // Side profile horizontal push-up posture
    const drop = depth * 0.15;
    const hipSag = cycleIndex % 3 === 2 ? depth * 0.075 : 0;

    landmarks[0] = { x: 0.20, y: 0.42 + drop, visibility: 0.96 };
    landmarks[11] = { x: 0.29, y: 0.46 + drop, visibility: 0.98 };
    landmarks[12] = { x: 0.31, y: 0.47 + drop, visibility: 0.94 };
    landmarks[13] = { x: 0.35 + depth * 0.04, y: 0.59 + drop * 0.5, visibility: 0.97 };
    landmarks[14] = { x: 0.37 + depth * 0.04, y: 0.60 + drop * 0.5, visibility: 0.92 };
    landmarks[15] = { x: 0.29, y: 0.72, visibility: 0.96 };
    landmarks[16] = { x: 0.31, y: 0.72, visibility: 0.91 };

    landmarks[23] = { x: 0.54, y: 0.54 + drop * 0.65 + hipSag, visibility: 0.98 };
    landmarks[24] = { x: 0.55, y: 0.55 + drop * 0.65 + hipSag, visibility: 0.94 };
    landmarks[25] = { x: 0.68, y: 0.62 + drop * 0.3, visibility: 0.96 };
    landmarks[26] = { x: 0.69, y: 0.62 + drop * 0.3, visibility: 0.92 };
    landmarks[27] = { x: 0.82, y: 0.71, visibility: 0.96 };
    landmarks[28] = { x: 0.83, y: 0.71, visibility: 0.92 };
    landmarks[31] = { x: 0.80, y: 0.74, visibility: 0.92 };
    landmarks[32] = { x: 0.81, y: 0.74, visibility: 0.90 };
  } else {
    // Lunges split stance
    const drop = depth * 0.17;
    const lean = postureSway;
    landmarks[0] = { x: 0.48 + lean, y: 0.16 + drop, visibility: 0.98 };
    landmarks[11] = { x: 0.44 + lean, y: 0.27 + drop, visibility: 0.97 };
    landmarks[12] = { x: 0.54 + lean, y: 0.27 + drop, visibility: 0.97 };
    landmarks[13] = { x: 0.40 + lean, y: 0.40 + drop, visibility: 0.94 };
    landmarks[14] = { x: 0.58 + lean, y: 0.40 + drop, visibility: 0.94 };
    landmarks[15] = { x: 0.42 + lean, y: 0.50 + drop, visibility: 0.91 };
    landmarks[16] = { x: 0.56 + lean, y: 0.50 + drop, visibility: 0.91 };

    landmarks[23] = { x: 0.45, y: 0.50 + drop, visibility: 0.98 };
    landmarks[24] = { x: 0.53, y: 0.50 + drop, visibility: 0.98 };
    // Front left leg flexing
    landmarks[25] = { x: 0.34 - depth * 0.04, y: 0.67 + depth * 0.03, visibility: 0.98 };
    landmarks[27] = { x: 0.35, y: 0.88, visibility: 0.97 };
    landmarks[31] = { x: 0.31, y: 0.90, visibility: 0.93 };
    // Rear right leg dropping
    landmarks[26] = { x: 0.62, y: 0.69 + depth * 0.14, visibility: 0.97 };
    landmarks[28] = { x: 0.70, y: 0.87, visibility: 0.96 };
    landmarks[32] = { x: 0.68, y: 0.90, visibility: 0.92 };
  }

  return landmarks;
}
