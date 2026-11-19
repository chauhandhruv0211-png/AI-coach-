import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Loader2, Play, ShieldCheck, UserCheck } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import type { FitnessLevel } from '../types/sportiq';

interface AuthPageProps {
  onBack: () => void;
  onDemoLogin: (customName?: string, level?: FitnessLevel) => void;
  onAuthSuccess: () => void;
}

export function AuthPage({ onBack, onDemoLogin, onAuthSuccess }: AuthPageProps) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('intermediate');

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onAuthSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (message.includes('popup-closed-by-user')) {
        setError('Sign-in popup was closed before completing. You can try again or enter Demo Mode.');
      } else {
        setError(`Authentication error: ${message}`);
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDemoLogin(athleteName.trim() || undefined, fitnessLevel);
  };

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col justify-center px-6 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to SportIQ AI
        </button>

        <div className="glass-surface-elevated rounded-2xl p-8 space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">
              Athlete Access
            </h1>
            <p className="text-sm text-slate-300 mt-1.5">
              Sign in with Google to persist workouts in Firestore, or start immediately in Judge
              Demo Mode.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {loadingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4 text-sky-600" />
            )}
            {loadingGoogle ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="px-3 text-xs text-slate-500">or quick athlete demo setup</span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div>
              <label htmlFor="demo-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Athlete Name (Optional for Demo)
              </label>
              <input
                id="demo-name"
                type="text"
                maxLength={80}
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="demo-level" className="block text-xs font-medium text-slate-300 mb-1.5">
                Training Level
              </label>
              <select
                id="demo-level"
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Enter Demo Mode
            </button>
          </form>

          <div className="flex items-start gap-2 text-xs text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Camera frames are processed locally in your browser; raw video is never uploaded or
              stored.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
