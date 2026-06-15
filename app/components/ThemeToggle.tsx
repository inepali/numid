"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Sync with html class initial state on mount
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Store in cookie for server side rendering
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl transition-all flex items-center justify-center shrink-0 border bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-800 dark:border-white/5 dark:text-slate-400 bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm dark:shadow-none"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme Mode"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
      )}
    </button>
  );
}
