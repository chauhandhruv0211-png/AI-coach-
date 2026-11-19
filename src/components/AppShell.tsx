import { useState } from 'react';
import {
  BarChart3,
  Bot,
  Camera,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import type { AppPage, UserProfile } from '../types/sportiq';

interface AppShellProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  profile: UserProfile;
  isDemoMode: boolean;
  onResetDemo: () => void;
  onSignOut: () => void;
  photoURL?: string | null;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: AppPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'coach', label: 'AI Workout Coach', icon: Bot },
  { id: 'live', label: 'Live Pose Analysis', icon: Camera },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'history', label: 'Workout History', icon: History },
  { id: 'profile', label: 'Profile and Settings', icon: Settings },
];

export function AppShell({
  activePage,
  onNavigate,
  profile,
  isDemoMode,
  onResetDemo,
  onSignOut,
  photoURL,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTitle = NAV_ITEMS.find((item) => item.id === activePage)?.label ?? 'Dashboard';

  const handleNavClick = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-[#070c1a]">
        <div className="h-16 px-6 flex items-center border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="font-display text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            SportIQ AI
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={photoURL || '/src/assets/images/avatar_athlete_profile_1795076529997.jpg'}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{profile.displayName}</div>
              <div className="text-xs text-slate-400 truncate capitalize">
                {profile.fitnessLevel} · {isDemoMode ? 'Demo Mode' : 'Cloud Synced'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDemoMode ? 'Exit Demo' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-[#070c1a] border-r border-slate-800 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="font-display text-2xl font-bold text-white">SportIQ AI</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isDemoMode ? 'Exit Demo' : 'Sign Out'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-[#050914]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs text-slate-400 hidden sm:inline">SportIQ AI /</span>
              <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                {activeTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isDemoMode && (
              <button
                type="button"
                onClick={onResetDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                Reset Demo
              </button>
            )}
            {activePage !== 'live' && (
              <button
                type="button"
                onClick={() => onNavigate('live')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Workout
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
