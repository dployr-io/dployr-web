// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Monitor, Sun, Moon } from "lucide-react";
import { useAppearance, type Appearance } from "@/hooks/use-appearance";
import { ConnectionStatus } from "@/components/connection-status";

export default function ThemeToggle() {
  const { appearance, updateAppearance } = useAppearance();

  const options: { id: Appearance; icon: typeof Monitor }[] = [
    { id: "system", icon: Monitor },
    { id: "light", icon: Sun },
    { id: "dark", icon: Moon },
  ];

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 rounded-full p-1 pl-2.5 shadow-lg">
      <ConnectionStatus />
      <div className="w-px h-4 bg-gray-200 dark:bg-neutral-700" />
      {options.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => updateAppearance(id)}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            appearance === id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-700"
          }`}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}
