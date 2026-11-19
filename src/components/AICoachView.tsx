import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { computeStats } from '../lib/demoData';
import type { AIInsights, CoachMessage, UserProfile, WorkoutSession } from '../types/sportiq';

interface AICoachViewProps {
  profile: UserProfile;
  workouts: WorkoutSession[];
  messages: CoachMessage[];
  pendingPrompt: string | null;
  onClearPendingPrompt: () => void;
  onAppendMessages: (newMsgs: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<void>;
}

const SUGGESTED_QUESTIONS = [
  'How can I improve my squat technique?',
  'How many repetitions should I target?',
  'How can I improve my stamina?',
  'What should my next workout look like?',
];

export function AICoachView({
  profile,
  workouts,
  messages,
  pendingPrompt,
  onClearPendingPrompt,
  onAppendMessages,
}: AICoachViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const stats = computeStats(workouts);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setGeminiAvailable(Boolean(d.geminiConfigured)))
      .catch(() => setGeminiAvailable(false));
  }, []);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    setInput('');

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          userProfile: profile,
          workoutStats: stats,
          recentWorkouts: workouts.slice(0, 8),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to reach Gemini AI Coach.');
        return;
      }

      await onAppendMessages([
        { role: 'user', content: trimmed },
        { role: 'assistant', content: data.reply },
      ]);
    } catch {
      setError('Network error communicating with AI coaching server.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (pendingPrompt) {
      const prompt = pendingPrompt;
      onClearPendingPrompt();
      void sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const handleAnalyzeHistory = async () => {
    setError(null);
    setLoadingInsights(true);
    try {
      const res = await fetch('/api/coach/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: profile,
          recentWorkouts: workouts.slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to generate performance analysis.');
        return;
      }
      setInsights(data.insights);
    } catch {
      setError('Network error communicating with AI coaching server.');
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Training Context & Quick Plan Generators */}
      <div className="lg:col-span-4 space-y-4">
        <div className="glass-surface-elevated rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Personal Trainer</h2>
              <p className="text-xs text-slate-400">Powered by Google Gemini</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-slate-400">Logged Sessions</div>
              <div className="font-mono text-lg font-semibold text-white tabular-nums">
                {stats.totalWorkouts}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Avg Form Score</div>
              <div className="font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                {stats.avgScore} / 100
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={loadingInsights}
            onClick={() => void handleAnalyzeHistory()}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {loadingInsights ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {loadingInsights ? 'Analyzing Telemetry...' : 'Analyze My Performance'}
          </button>

          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="text-xs font-medium text-slate-400">Generate Workout Plan</div>
            <div className="grid grid-cols-3 gap-2">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={sending}
                  onClick={() =>
                    void sendMessage(
                      `Create a structured ${tier} weekly workout plan using Squats, Push-ups, and Lunges with rest and recovery days tailored to my stats.`
                    )
                  }
                  className="py-2 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Guidance covers athletic technique, pacing, and rest scheduling. For pain or suspected
            injury, consult a medical professional.
          </p>
        </div>

        {insights && (
          <div className="glass-surface rounded-2xl p-5 space-y-3 text-xs">
            <div className="font-semibold text-sky-400">Overall Performance Summary</div>
            <p className="text-slate-200 leading-relaxed">{insights.summary}</p>
            <div>
              <div className="font-semibold text-emerald-400 mb-1">Strengths</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                {insights.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-amber-400 mb-1">Focus Areas</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                {insights.improvements.map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-800 text-slate-300">
              <span className="font-semibold text-sky-400">Next Session: </span>
              {insights.nextSessionPlan}
            </div>
            <div className="text-slate-300">
              <span className="font-semibold text-emerald-400">Recovery: </span>
              {insights.recoveryNote}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Chat Interface */}
      <div className="lg:col-span-8 glass-surface rounded-2xl flex flex-col h-[680px]">
        <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Coaching Conversation</h3>
            <p className="text-xs text-slate-400">
              Ask about technique, rep targets, stamina, or recovery
            </p>
          </div>
          {geminiAvailable === false && (
            <span className="text-xs text-amber-300">
              Gemini API key not detected on server
            </span>
          )}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-base font-semibold text-white">
                  Ask Your SportIQ AI Coach
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your workout history, average form score ({stats.avgScore}/100), and fitness
                  level ({profile.fitnessLevel}) are automatically shared with the coach.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 w-full pt-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(q)}
                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-sky-500 text-slate-950 font-medium'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-slate-900/90 border border-slate-800 text-xs text-slate-300 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                Reviewing your workout telemetry...
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Prompts + Composer */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending}
                  onClick={() => void sendMessage(q)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about squat depth, rep targets, stamina, or next workout..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
