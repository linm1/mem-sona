"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type View = "search" | "graph" | "categories";

interface NavigationContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>("search");

  return (
    <NavigationContext.Provider value={{ sidebarOpen, setSidebarOpen, activeView, setActiveView }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used within NavigationProvider");
  return context;
}
