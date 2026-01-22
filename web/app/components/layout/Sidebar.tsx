"use client";
import { useNavigation } from "../../contexts/NavigationContext";
import { useState } from "react";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.5 19.5A5.5 5.5 0 0 1 3 14V8.5L7.5 11l4-7 3.5 4.5L19 6v8a5.5 5.5 0 0 1-5.5 5.5h-5Z" />
    </svg>
  );
}

type SearchMode = "hybrid" | "vector" | "graph";
type RecencyFilter = "all" | "7days" | "30days";

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useNavigation();
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>("all");

  const [categories, setCategories] = useState({
    preferences: false,
    skills: false,
    projects: false,
    context: false,
  });

  const [nodeTypes, setNodeTypes] = useState({
    project: false,
    tool: false,
    skill: false,
    concept: false,
  });

  const handleCategoryChange = (category: keyof typeof categories) => {
    setCategories({ ...categories, [category]: !categories[category] });
  };

  const handleNodeTypeChange = (nodeType: keyof typeof nodeTypes) => {
    setNodeTypes({ ...nodeTypes, [nodeType]: !nodeTypes[nodeType] });
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay-mobile ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar-mobile ${sidebarOpen ? "active" : ""} lg:static lg:transform-none lg:w-64 p-4 space-y-6`}>
        {/* Search Input */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="input-brutal pl-10 w-full"
          />
        </div>

        {/* Search Mode Toggle */}
        <div className="space-y-2">
          <label className="font-mono-brutal text-xs text-muted">Search Mode</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setSearchMode("hybrid")}
              className={`btn-brutal text-[10px] py-1 ${
                searchMode === "hybrid" ? "bg-accent text-white border-accent" : ""
              }`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setSearchMode("vector")}
              className={`btn-brutal text-[10px] py-1 ${
                searchMode === "vector" ? "bg-accent text-white border-accent" : ""
              }`}
            >
              Vector
            </button>
            <button
              onClick={() => setSearchMode("graph")}
              className={`btn-brutal text-[10px] py-1 ${
                searchMode === "graph" ? "bg-accent text-white border-accent" : ""
              }`}
            >
              Graph
            </button>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="space-y-3">
          <label className="font-mono-brutal text-xs text-muted">Categories</label>
          <div className="space-y-2">
            {Object.keys(categories).map((category) => (
              <label key={category} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox-brutal"
                  checked={categories[category as keyof typeof categories]}
                  onChange={() => handleCategoryChange(category as keyof typeof categories)}
                />
                <span className="text-sm capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Node Types Filter */}
        <div className="space-y-3">
          <label className="font-mono-brutal text-xs text-muted">Node Types</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox-brutal"
                checked={nodeTypes.project}
                onChange={() => handleNodeTypeChange("project")}
              />
              <span className="badge-node badge-project">Project</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox-brutal"
                checked={nodeTypes.tool}
                onChange={() => handleNodeTypeChange("tool")}
              />
              <span className="badge-node badge-tool">Tool</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox-brutal"
                checked={nodeTypes.skill}
                onChange={() => handleNodeTypeChange("skill")}
              />
              <span className="badge-node badge-skill">Skill</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox-brutal"
                checked={nodeTypes.concept}
                onChange={() => handleNodeTypeChange("concept")}
              />
              <span className="badge-node badge-concept">Concept</span>
            </label>
          </div>
        </div>

        {/* Recency Filter */}
        <div className="space-y-3">
          <label className="font-mono-brutal text-xs text-muted">Recency</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="recency"
                className="radio-brutal"
                checked={recencyFilter === "all"}
                onChange={() => setRecencyFilter("all")}
              />
              <span className="text-sm">All Time</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="recency"
                className="radio-brutal"
                checked={recencyFilter === "7days"}
                onChange={() => setRecencyFilter("7days")}
              />
              <span className="text-sm">Last 7 Days</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="recency"
                className="radio-brutal"
                checked={recencyFilter === "30days"}
                onChange={() => setRecencyFilter("30days")}
              />
              <span className="text-sm">Last 30 Days</span>
            </label>
          </div>
        </div>

        {/* Hot Memories Info Card */}
        <div className="border border-highlight bg-highlight/5 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <FireIcon />
            <span className="font-mono-brutal text-xs text-highlight">Hot Memories</span>
          </div>
          <p className="text-xs text-muted">
            Frequently accessed items appear first in search results.
          </p>
        </div>
      </aside>
    </>
  );
}
