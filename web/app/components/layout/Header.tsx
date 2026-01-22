"use client";
import { useNavigation } from "../../contexts/NavigationContext";

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m6-12v6m0 6v6M1 12h6m6 0h6" />
      <path d="M19.5 6L21 4.5m-18 0L4.5 6m15 12-1.5 1.5m-12 0L4.5 18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function Header() {
  const { sidebarOpen, setSidebarOpen } = useNavigation();

  return (
    <header className="sticky top-0 z-40 h-16 border-b-2 border-ink bg-paper">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-icon lg:hidden"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-2">
            <BrainIcon />
            <span className="font-mono-brutal text-lg">mem-sona</span>
          </div>

          <span className="hidden text-sm text-muted md:inline">
            Personal Memory Infrastructure
          </span>
        </div>

        {/* Center: Search (desktop) */}
        <div className="hidden flex-1 max-w-md mx-8 md:block">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search memories..."
              className="input-brutal pl-10 w-full"
            />
          </div>
        </div>

        {/* Right: Settings + Add Memory */}
        <div className="flex items-center gap-2">
          <button className="btn-icon" aria-label="Settings">
            <SettingsIcon />
          </button>

          <button className="btn-brutal-primary gap-2 hidden md:flex">
            <PlusIcon />
            Add Memory
          </button>
        </div>
      </div>
    </header>
  );
}
