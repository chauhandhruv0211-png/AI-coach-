import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  AlertTriangle,
  Bot,
  Camera,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import {
  DEFAULT_THRESHOLDS,
  ExerciseStateMachine,
  FrameAnalysis,
  generateSyntheticLandmarks,
  POSE_CONNECTIONS,
  PoseLandmark,
} from '../lib/exerciseAnalyzer';
import { formatDuration, formatExerciseLabel } from '../lib/demoData';
import type {
  AIInsights,
  ExerciseThresholds,
  ExerciseType,
  UserProfile,
  WorkoutSession,
} from '../types/sportiq';

interface LivePoseViewProps {
  initialExercise: ExerciseType;
  profile: UserProfile;
  recentWorkouts: WorkoutSession[];
  onSaveWorkout: (
    session: Omit<WorkoutSession, 'id' | 'createdAt' | 'userId'>
  ) => Promise<void>;
  onOpenCoachWithTopic: (prompt: string) => void;
}

type SessionStatus = 'idle' | 'running' | 'paused';
type InputSource = 'webcam' | 'simulation';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export function LivePoseView({
  initialExercise,
  profile,
  recentWorkouts,
  onSaveWorkout,
  onOpenCoachWithTopic,
}: LivePoseViewProps) {
  const [exercise, setExercise] = useState<ExerciseType>(initialExercise);
  const [source, setSource] = useState<InputSource>('webcam');
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [thresholds, setThresholds] = useState<ExerciseThresholds>({
    ...DEFAULT_THRESHOLDS[initialExercise],
  });
  const [showThresholds, setShowThresholds] = useState(false);

  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<Omit<
    WorkoutSession,
    'id' | 'createdAt' | 'userId'
  > | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<FrameAnalysis>({
    phase: 'READY',
    reps: 0,
    incompleteReps: 0,
    primaryAngle: 170,
    secondaryAngle: 170,
    alignmentAngle: 175,
    confidence: 0,
    alignmentScore: 95,
    performanceScore: 95,
    feedback: 'Select an exercise and press Start Session to begin pose tracking.',
    feedbackTone: 'nominal',
    minAngle: 0,
    maxAngle: 0,
    avgAlignment: 95,
    formNotes: [],
    landmarksDetected: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const machineRef = useRef<ExerciseStateMachine>(new ExerciseStateMachine(initialExercise));
  const simStartRef = useRef<number>(0);
  const activeTimeMsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  useEffect(() => {
    setExercise(initialExercise);
    setThresholds({ ...DEFAULT_THRESHOLDS[initialExercise] });
    machineRef.current.reset(initialExercise);
  }, [initialExercise]);

  const stopMediaStream = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMediaStream();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [stopMediaStream]);

  const ensurePoseLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setModelLoading(true);
    setModelError(null);
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      return landmarker;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to initialize MediaPipe Pose Landmarker.';
      setModelError(
        `MediaPipe model load failed (${msg}). You can still test the full analyzer using Demo Simulation mode.`
      );
      return null;
    } finally {
      setModelLoading(false);
    }
  }, []);

  const drawSkeleton = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      landmarks: PoseLandmark[] | null,
      frameAnalysis: FrameAnalysis,
      isWebcamMode: boolean,
      videoEl?: HTMLVideoElement | null
    ) => {
      ctx.clearRect(0, 0, width, height);

      if (isWebcamMode && videoEl && videoEl.readyState >= 2) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, 0, 0, width, height);
        ctx.restore();
      } else {
        // Clean dark biomechanics grid backdrop for Demo Simulation
        ctx.fillStyle = '#070d1d';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        const step = 48;
        for (let x = 0; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Ground baseline
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.12, height * 0.91);
        ctx.lineTo(width * 0.88, height * 0.91);
        ctx.stroke();
      }

      if (!landmarks || landmarks.length === 0) return;

      const mapX = (normX: number) => (isWebcamMode ? (1 - normX) * width : normX * width);
      const mapY = (normY: number) => normY * height;

      const boneColor =
        frameAnalysis.feedbackTone === 'caution'
          ? '#f59e0b'
          : frameAnalysis.phase === 'BOTTOM'
          ? '#22c55e'
          : '#38bdf8';

      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const a = landmarks[startIdx];
        const b = landmarks[endIdx];
        if (!a || !b) continue;
        if ((a.visibility ?? 1) < 0.25 || (b.visibility ?? 1) < 0.25) continue;

        ctx.beginPath();
        ctx.moveTo(mapX(a.x), mapY(a.y));
        ctx.lineTo(mapX(b.x), mapY(b.y));
        ctx.stroke();
      }

      const keyJoints = new Set([0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]);
      for (let i = 0; i < landmarks.length; i += 1) {
        if (!keyJoints.has(i)) continue;
        const lm = landmarks[i];
        if (!lm || (lm.visibility ?? 1) < 0.25) continue;
        const cx = mapX(lm.x);
        const cy = mapY(lm.y);

        ctx.beginPath();
        ctx.arc(cx, cy, i === 0 ? 7 : 5.5, 0, Math.PI * 2);
        ctx.fillStyle = frameAnalysis.phase === 'BOTTOM' ? '#22c55e' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0ea5e9';
        ctx.stroke();
      }

      // Draw primary joint angle callout next to active hinge joint
      const targetJointIdx = exercise === 'pushups' ? 13 : 25;
      const joint = landmarks[targetJointIdx];
      if (joint && (joint.visibility ?? 1) > 0.3) {
        const jx = mapX(joint.x) + 14;
        const jy = mapY(joint.y) - 10;
        ctx.fillStyle = 'rgba(5, 9, 20, 0.82)';
        ctx.fillRect(jx - 4, jy - 16, 56, 22);
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${frameAnalysis.primaryAngle}°`, jx, jy);
      }
    },
    [exercise]
  );

  const startSession = async (requestedSource?: InputSource) => {
    const activeSource = requestedSource ?? source;
    setCompletedSummary(null);
    setAiInsights(null);
    setInsightsError(null);
    setCameraError(null);

    machineRef.current.reset(exercise);
    machineRef.current.setThresholds(thresholds);
    activeTimeMsRef.current = 0;
    setElapsedSeconds(0);
    simStartRef.current = performance.now();
    lastTickRef.current = performance.now();

    if (activeSource === 'webcam') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Webcam API is unavailable in this browser context. Live pose analysis requires camera access—switch to Demo Simulation to test immediately.'
        );
        return;
      }

      const landmarker = await ensurePoseLandmarker();
      if (!landmarker) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('running');
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Live analysis requires webcam access. Enable camera permission in your browser settings or launch Demo Simulation below.'
          );
        } else {
          setCameraError(
            'No accessible camera was detected. Live analysis requires a connected webcam, or you can use Demo Simulation.'
          );
        }
      }
    } else {
      setStatus('running');
    }
  };

  useEffect(() => {
    if (status !== 'running') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      activeTimeMsRef.current += delta;
      setElapsedSeconds(Math.floor(activeTimeMsRef.current / 1000));

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        if (source === 'webcam') {
          const video = videoRef.current;
          const landmarker = landmarkerRef.current;
          if (video && landmarker && video.readyState >= 2) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth || 960;
              canvas.height = video.videoHeight || 540;
            }
            let detectedLandmarks: PoseLandmark[] | null = null;
            if (video.currentTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = video.currentTime;
              const result = landmarker.detectForVideo(video, now);
              if (result.landmarks && result.landmarks.length > 0) {
                detectedLandmarks = result.landmarks[0];
              }
            }
            const nextAnalysis = detectedLandmarks
              ? machineRef.current.processFrame(detectedLandmarks, now)
              : machineRef.current.getSnapshot();
            setAnalysis(nextAnalysis);
            drawSkeleton(ctx, canvas.width, canvas.height, detectedLandmarks, nextAnalysis, true, video);
          }
        } else {
          if (canvas.width !== 960 || canvas.height !== 540) {
            canvas.width = 960;
            canvas.height = 540;
          }
          const simLandmarks = generateSyntheticLandmarks(exercise, activeTimeMsRef.current);
          const nextAnalysis = machineRef.current.processFrame(simLandmarks, now);
          setAnalysis(nextAnalysis);
          drawSkeleton(ctx, canvas.width, canvas.height, simLandmarks, nextAnalysis, false, null);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [status, source, exercise, drawSkeleton]);

  const handleExerciseChange = (nextEx: ExerciseType) => {
    if (status === 'running') {
      stopMediaStream();
      setStatus('idle');
    }
    setExercise(nextEx);
    const nextThresholds = { ...DEFAULT_THRESHOLDS[nextEx] };
    setThresholds(nextThresholds);
    machineRef.current.reset(nextEx);
    machineRef.current.setThresholds(nextThresholds);
    setElapsedSeconds(0);
    setCompletedSummary(null);
    setAnalysis(machineRef.current.getSnapshot());
  };

  const handleThresholdChange = (key: keyof ExerciseThresholds, value: number) => {
    const next = { ...thresholds, [key]: value };
    setThresholds(next);
    machineRef.current.setThresholds(next);
  };

  const handlePauseResume = () => {
    if (status === 'running') {
      setStatus('paused');
    } else if (status === 'paused') {
      lastTickRef.current = performance.now();
      setStatus('running');
    }
  };

  const handleStopAndSave = async () => {
    stopMediaStream();
    setStatus('idle');

    const finalSnap = machineRef.current.getSnapshot();
    const duration = Math.max(1, elapsedSeconds);
    const summaryText =
      finalSnap.reps === 0
        ? `Session ended after ${formatDuration(duration)} with ${finalSnap.incompleteReps} incomplete attempts.`
        : `Completed ${finalSnap.reps} ${formatExerciseLabel(exercise).toLowerCase()} in ${formatDuration(
            duration
          )} with ${finalSnap.avgAlignment}% average posture alignment.`;

    const sessionPayload: Omit<WorkoutSession, 'id' | 'createdAt' | 'userId'> = {
      exercise,
      reps: finalSnap.reps,
      incompleteReps: finalSnap.incompleteReps,
      durationSeconds: duration,
      performanceScore: finalSnap.reps > 0 ? finalSnap.performanceScore : Math.min(70, finalSnap.avgAlignment),
      avgConfidence: finalSnap.confidence || 0.9,
      feedbackSummary: summaryText,
      formNotes:
        finalSnap.formNotes.length > 0
          ? finalSnap.formNotes
          : [finalSnap.feedback],
      minAngle: finalSnap.minAngle,
      maxAngle: finalSnap.maxAngle,
      avgAlignment: finalSnap.avgAlignment,
      isDemo: source === 'simulation',
    };

    setSaving(true);
    try {
      await onSaveWorkout(sessionPayload);
      setCompletedSummary(sessionPayload);
    } finally {
      setSaving(false);
    }
  };

  const fetchSessionInsights = async (session: Omit<WorkoutSession, 'id' | 'createdAt' | 'userId'>) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch('/api/coach/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          userProfile: profile,
          recentWorkouts: recentWorkouts.slice(0, 5),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInsightsError(data.error || 'Unable to generate AI insights right now.');
        return;
      }
      setAiInsights(data.insights);
    } catch {
      setInsightsError('Network error reaching AI coaching server.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const primaryJointLabel =
    exercise === 'pushups' ? 'Elbow Angle' : exercise === 'lunges' ? 'Lead Knee Angle' : 'Knee Flexion';

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Exercise & Source Controls */}
      <div className="glass-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1">Exercise:</span>
          {(['squats', 'pushups', 'lunges'] as ExerciseType[]).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleExerciseChange(ex)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                exercise === ex
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {formatExerciseLabel(ex)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (status === 'running') {
                  stopMediaStream();
                  setStatus('idle');
                }
                setSource('webcam');
                setCameraError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                source === 'webcam' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Webcam
            </button>
            <button
              type="button"
              onClick={() => {
                if (status === 'running') {
                  stopMediaStream();
                  setStatus('idle');
                }
                setSource('simulation');
                setCameraError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                source === 'simulation'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Demo Simulation
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowThresholds((v) => !v)}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            Thresholds
          </button>
        </div>
      </div>

      {/* Configurable Angle Thresholds Drawer */}
      {showThresholds && (
        <div className="glass-surface rounded-2xl p-5 grid sm:grid-cols-3 gap-5">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300">Top Lockout Threshold</span>
              <span className="font-mono text-sky-400 tabular-nums">{thresholds.topAngle}°</span>
            </div>
            <input
              type="range"
              min={145}
              max={175}
              value={thresholds.topAngle}
              onChange={(e) => handleThresholdChange('topAngle', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300">Target Depth Angle</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                ≤ {thresholds.bottomAngle}°
              </span>
            </div>
            <input
              type="range"
              min={75}
              max={125}
              value={thresholds.bottomAngle}
              onChange={(e) => handleThresholdChange('bottomAngle', Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300">Posture Alignment Tolerance</span>
              <span className="font-mono text-amber-400 tabular-nums">
                ±{thresholds.alignmentTolerance}°
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={38}
              value={thresholds.alignmentTolerance}
              onChange={(e) =>
                handleThresholdChange('alignmentTolerance', Number(e.target.value))
              }
              className="w-full accent-amber-400"
            />
          </div>
        </div>
      )}

      {/* Alerts for Camera / Model Loading */}
      {cameraError && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-sm text-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Webcam Access Required for Live Feed</div>
              <p className="text-xs text-amber-200/90 mt-0.5">{cameraError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSource('simulation');
              setCameraError(null);
              void startSession('simulation');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Run Demo Simulation
          </button>
        </div>
      )}

      {modelError && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-sm text-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">{modelError}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSource('simulation');
              setModelError(null);
              void startSession('simulation');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Switch to Demo Simulation
          </button>
        </div>
      )}

      {/* Main Pose Viewport + Telemetry Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Video / Skeleton Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#070d1d] aspect-video">
            <video ref={videoRef} playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="w-full h-full object-contain block" />

            {status === 'idle' && (
              <div className="absolute inset-0 bg-[#050914]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  {source === 'webcam' ? (
                    <Camera className="w-7 h-7" />
                  ) : (
                    <Cpu className="w-7 h-7 text-emerald-400" />
                  )}
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-lg font-semibold text-white">
                    {formatExerciseLabel(exercise)} Pose Analyzer Ready
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {source === 'webcam'
                      ? 'Press Start Session to grant webcam access and track 33 MediaPipe body landmarks in real time.'
                      : 'Demo Simulation mode renders a live 33-landmark kinematic athlete so you can inspect angle tracking, rep counting, and posture cues without a camera.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={modelLoading}
                    onClick={() => void startSession()}
                    className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    {modelLoading ? 'Loading MediaPipe Model...' : 'Start Session'}
                  </button>
                  {source === 'webcam' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSource('simulation');
                        void startSession('simulation');
                      }}
                      className="px-5 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                    >
                      Try Demo Simulation
                    </button>
                  )}
                </div>
              </div>
            )}

            {status === 'paused' && (
              <div className="absolute inset-0 bg-[#050914]/65 backdrop-blur-xs flex items-center justify-center">
                <div className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white">
                  Analysis Paused
                </div>
              </div>
            )}
          </div>

          {/* Session Playback Controls */}
          <div className="glass-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {status === 'idle' ? (
                <button
                  type="button"
                  disabled={modelLoading}
                  onClick={() => void startSession()}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {modelLoading ? 'Initializing...' : 'Start'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {status === 'running' ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Resume
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={status === 'idle' || saving}
                onClick={() => void handleStopAndSave()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Stop & Save Workout'}
              </button>
            </div>

            <div className="flex items-center gap-5 text-xs">
              <div>
                <span className="text-slate-400">Timer: </span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Confidence: </span>
                <span className="font-mono font-semibold text-sky-400 tabular-nums">
                  {Math.round(analysis.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Real-Time Telemetry & Rule-Based Feedback */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-surface-elevated rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Completed Repetitions</div>
                <div className="font-mono text-5xl font-bold text-white tabular-nums mt-1">
                  {analysis.reps}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Movement Phase</div>
                <div className="font-mono text-sm font-semibold text-sky-400 mt-1">
                  {analysis.phase}
                </div>
                <div className="text-xs text-amber-400 font-mono tabular-nums mt-2">
                  Incomplete: {analysis.incompleteReps}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">{primaryJointLabel}</div>
                <div className="font-mono text-2xl font-semibold text-sky-400 tabular-nums mt-0.5">
                  {analysis.primaryAngle}°
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Posture Alignment</div>
                <div className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums mt-0.5">
                  {analysis.alignmentScore}%
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Live Performance Score</span>
              <span className="font-mono text-lg font-semibold text-white tabular-nums">
                {analysis.performanceScore} / 100
              </span>
            </div>

            {/* Live Rule-Based Feedback Box */}
            <div
              className={`rounded-xl p-4 border ${
                analysis.feedbackTone === 'positive'
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                  : analysis.feedbackTone === 'caution'
                  ? 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-200'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                Real-Time Posture Cue
              </div>
              <div className="text-sm font-medium mt-1 leading-snug">{analysis.feedback}</div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              SportIQ AI tracks joint geometry for movement coaching only. It does not detect
              injuries or provide medical diagnoses.
            </p>
          </div>
        </div>
      </div>

      {/* Completed Workout Summary Card */}
      {completedSummary && (
        <div className="glass-surface-elevated rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Workout Saved: {formatExerciseLabel(completedSummary.exercise)}
                </h3>
                <p className="text-xs text-slate-400">{completedSummary.feedbackSummary}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={insightsLoading}
                onClick={() => void fetchSessionInsights(completedSummary)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                {insightsLoading ? 'Analyzing with Gemini...' : 'Generate AI Insights'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenCoachWithTopic(
                    `I just finished ${completedSummary.reps} ${formatExerciseLabel(
                      completedSummary.exercise
                    )} with a ${completedSummary.performanceScore}/100 form score (${
                      completedSummary.incompleteReps
                    } incomplete reps). What should I focus on next?`
                  )
                }
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Discuss in AI Coach
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-400">Valid Reps</div>
              <div className="font-mono text-2xl font-semibold text-sky-400 tabular-nums">
                {completedSummary.reps}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Incomplete Reps</div>
              <div className="font-mono text-2xl font-semibold text-amber-400 tabular-nums">
                {completedSummary.incompleteReps}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Performance Score</div>
              <div className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
                {completedSummary.performanceScore} / 100
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Joint Angle Range</div>
              <div className="font-mono text-2xl font-semibold text-white tabular-nums">
                {completedSummary.minAngle}°–{completedSummary.maxAngle}°
              </div>
            </div>
          </div>

          {insightsError && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              {insightsError}
            </div>
          )}

          {aiInsights && (
            <div className="rounded-xl bg-slate-900/90 border border-sky-500/30 p-5 space-y-4">
              <div className="text-xs font-semibold text-sky-400">
                Gemini AI Performance Review
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{aiInsights.summary}</p>
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-emerald-400 mb-1.5">Key Strengths</div>
                  <ul className="space-y-1 text-slate-300 list-disc pl-4">
                    {aiInsights.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-amber-400 mb-1.5">Technique Improvements</div>
                  <ul className="space-y-1 text-slate-300 list-disc pl-4">
                    {aiInsights.improvements.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-800 grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-sky-400">Next Session Target: </span>
                  <span className="text-slate-300">{aiInsights.nextSessionPlan}</span>
                </div>
                <div>
                  <span className="font-semibold text-emerald-400">Recovery Guidance: </span>
                  <span className="text-slate-300">{aiInsights.recoveryNote}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
