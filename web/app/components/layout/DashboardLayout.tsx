"use client";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            <Sidebar />
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </NavigationProvider>
  );
}
