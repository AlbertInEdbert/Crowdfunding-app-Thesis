'use client'

import { useState } from "react";
import {
  Zap,
  LayoutDashboard,
  Boxes,
  Users,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, active: true },
      { label: "Projects", icon: Boxes },
      { label: "Team", icon: Users },
      { label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Preferences",
    items: [{ label: "Settings", icon: Settings }],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-200 ${
        collapsed ? "w-18" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Zap className="h-4 w-4" strokeWidth={2.5} />
        </span>
        {!collapsed && (
          <span className="truncate text-base font-semibold tracking-tight text-zinc-900">
            Beacon
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-6">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <a
                      href="#"
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                        item.active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <div
          className={`mb-2 flex items-center gap-3 rounded-md px-3 py-2 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
            JS
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">Jamie Sun</p>
              <p className="truncate text-xs text-zinc-500">jamie@beacon.dev</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              aria-label="Sign out"
              className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}