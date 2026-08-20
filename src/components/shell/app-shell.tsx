"use client";

import { useState, type ReactNode } from "react";

import { Copilot } from "@/components/shell/copilot";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ToastProvider } from "@/components/ui/primitives";
import type { Notification } from "@/lib/types";

export function AppShell({
  user,
  workspaceName,
  plan,
  launchCompletion,
  notifications,
  children,
}: {
  user: { full_name: string; email: string };
  workspaceName: string;
  plan: string;
  launchCompletion: number;
  notifications: Notification[];
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-ink-50/60">
        <Sidebar
          workspaceName={workspaceName}
          plan={plan}
          launchCompletion={launchCompletion}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            notifications={notifications}
            onOpenMenu={() => setMenuOpen(true)}
            onOpenCopilot={() => setCopilotOpen(true)}
          />
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <Copilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </ToastProvider>
  );
}
