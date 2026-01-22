"use client";
import { useNavigation } from "../../contexts/NavigationContext";

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="3" />
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M12 8v3m-4 3-2 2m8-5 2 2" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const { activeView, setActiveView } = useNavigation();

  const handleNavClick = (view: "search" | "graph" | "categories") => {
    setActiveView(view);
    onClose();
  };

  return (
    <>
      <div className={`drawer-overlay ${isOpen ? "active" : ""}`} onClick={onClose} />

      <div className={`drawer-panel ${isOpen ? "active" : ""} w-64`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink p-4">
          <span className="font-mono-brutal text-sm">Navigation</span>
          <button onClick={onClose} className="btn-icon">
            <CloseIcon />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          <button
            onClick={() => handleNavClick("search")}
            className={`flex items-center gap-3 w-full p-3 text-left border border-ink hover-brutal ${
              activeView === "search" ? "bg-accent text-white border-accent" : "bg-paper"
            }`}
          >
            <SearchIcon />
            <span className="font-mono-brutal text-sm">Search</span>
          </button>

          <button
            onClick={() => handleNavClick("graph")}
            className={`flex items-center gap-3 w-full p-3 text-left border border-ink hover-brutal ${
              activeView === "graph" ? "bg-accent text-white border-accent" : "bg-paper"
            }`}
          >
            <GraphIcon />
            <span className="font-mono-brutal text-sm">Graph</span>
          </button>

          <button
            onClick={() => handleNavClick("categories")}
            className={`flex items-center gap-3 w-full p-3 text-left border border-ink hover-brutal ${
              activeView === "categories" ? "bg-accent text-white border-accent" : "bg-paper"
            }`}
          >
            <FolderIcon />
            <span className="font-mono-brutal text-sm">Categories</span>
          </button>
        </nav>
      </div>
    </>
  );
}
