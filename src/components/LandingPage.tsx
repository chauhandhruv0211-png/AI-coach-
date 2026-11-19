import { Activity, ArrowRight, Camera, Cpu, LineChart, ShieldCheck, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onEnterDemo: () => void;
  onOpenAuth: () => void;
  onStartLiveDemo: () => void;
}

export function LandingPage({ onEnterDemo, onOpenAuth, onStartLiveDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#050914] text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#050914]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            SportIQ AI
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a
              href="#platform"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              Platform
            </a>
            <a
              href="#exercises"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              Exercises
            </a>
            <a
              href="#coaching"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              AI Coach
            </a>
            <a
              href="#demo-flow"
              className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              Demo Mode
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="text-xs font-medium tracking-wider text-sky-400">
                Real-Time Computer Vision · Sports Biomechanics · AI Coaching
              </div>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.04]"
                style={{ fontSize: 'clamp(2.5rem, 4.4vw, 4rem)', textWrap: 'balance' }}
              >
                Train Smarter. Move Better. Perform Stronger.
              </h1>

              <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                SportIQ AI transforms any standard webcam into a real-time athletic movement analyzer.
                Detect 33 body landmarks with MediaPipe, count verified repetitions via angle state
                machines, and receive actionable coaching powered by Gemini.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={onStartLiveDemo}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Start Live Analysis
                </button>
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 hover:border-emerald-400/70 bg-slate-900/70 hover:bg-slate-800 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Judge Demo Dashboard
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-6">
                <div>
                  <div className="font-mono text-2xl font-semibold text-white tabular-nums">33</div>
                  <div className="text-xs text-slate-400 mt-1">Body landmarks tracked</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums">3</div>
                  <div className="text-xs text-slate-400 mt-1">Core strength patterns</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-sky-400 tabular-nums">100%</div>
                  <div className="text-xs text-slate-400 mt-1">Browser-side pose inference</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[320px]">
              <img
                src="/src/assets/images/hero_athlete_studio_1795076530293.jpg"
                alt="Athlete performing barbell squat inside a dark sports biomechanics lab"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-[#050914]/25 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-emerald-400">
                    MediaPipe Pose Landmarker + Gemini Coaching
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    Frame-by-frame joint angle precision & posture alignment telemetry
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section id="platform" className="border-t border-slate-800/80 bg-[#070d1c]/70 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Engineered for Real Athletic Telemetry
              </h2>
              <p className="text-slate-300 text-sm lg:text-base mt-3 leading-relaxed">
                Every metric, repetition count, and coaching cue is derived directly from live joint
                angles and movement phases—never randomized placeholders.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass-surface rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">01. Browser Pose Estimation</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Runs Google MediaPipe Pose Landmarker directly on webcam video frames in the browser
                  for low-latency skeleton tracking and confidence scoring.
                </p>
              </div>

              <div className="glass-surface rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">02. State-Machine Rep Counting</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Tracks READY, DESCENDING, BOTTOM, and ASCENDING phases with configurable thresholds
                  to prevent double-counting and flag incomplete depth.
                </p>
              </div>

              <div className="glass-surface rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">03. Gemini AI Trainer</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Synthesizes your saved workout history, alignment trends, and personal bests into
                  personalized training plans, recovery guidance, and Q&amp;A.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Exercises */}
        <section id="exercises" className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src="/src/assets/images/pose_squat_reference_1795076530609.jpg"
                alt="Athlete demonstrating parallel squat alignment"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover aspect-[4/3]"
              />
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div>
                <h2 className="font-display text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  Three Foundational Movements, Analyzed Joint by Joint
                </h2>
                <p className="text-sm text-slate-300 mt-2">
                  Switch exercises seamlessly inside the Live Pose Analysis workspace or adjust angle
                  thresholds for your mobility level.
                </p>
              </div>

              <div className="space-y-4">
                <div className="glass-surface rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">Squats</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Evaluates hip-knee-ankle flexion, parallel depth completion, torso lean, and
                      frontal-plane knee alignment.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-sky-400 whitespace-nowrap shrink-0">
                    Target ≤ 105° knee
                  </span>
                </div>

                <div className="glass-surface rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">Push-ups</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Tracks shoulder-elbow-wrist flexion and monitors shoulder-hip-ankle plank
                      linearity to catch hip sag or incomplete lockouts.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 whitespace-nowrap shrink-0">
                    Target ≤ 95° elbow
                  </span>
                </div>

                <div className="glass-surface rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">Lunges</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Monitors lead knee flexion depth, split-stance balance, and upright trunk
                      stability throughout each repetition.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-sky-400 whitespace-nowrap shrink-0">
                    Target ≤ 108° lead knee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Coach & Judge Demo Walkthrough */}
        <section id="coaching" className="border-t border-slate-800/80 bg-[#070d1c]/70 py-16">
          <div id="demo-flow" className="max-w-7xl mx-auto px-6">
            <div className="glass-surface-elevated rounded-2xl p-8 lg:p-10 grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <Cpu className="w-4 h-4" />
                  Hackathon Judge Demo Ready
                </div>
                <h2 className="font-display text-3xl font-bold text-white tracking-tight">
                  Test Live Webcam Detection or Interactive Kinematic Simulation
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  No setup barriers: launch Demo Mode to explore pre-populated 30-day analytics, run
                  real-time MediaPipe pose detection on your webcam (or switch to our built-in
                  33-landmark kinematic simulator if no camera is attached), and chat with the Gemini
                  AI performance coach.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Athletic technique telemetry only — SportIQ AI does not diagnose injuries or
                    provide medical advice.
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onStartLiveDemo}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Launch Live Pose Analysis
                </button>
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LineChart className="w-4 h-4 text-sky-400" />
                  Explore Full Athlete Dashboard
                </button>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full py-3 px-5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 text-sm font-medium transition-colors cursor-pointer"
                >
                  Sign In with Google Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>SportIQ AI · Train Smarter. Move Better. Perform Stronger.</div>
          <div>Computer Vision by MediaPipe · Coaching Intelligence by Google Gemini</div>
        </div>
      </footer>
    </div>
  );
}
