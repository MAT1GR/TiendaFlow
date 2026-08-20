import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { currentUser, currentWorkspace } from "@/lib/auth";
import { getLaunchStatus } from "@/lib/launch";
import { ensureSubscription, listNotifications } from "@/lib/repo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/ingresar");

  const workspace = await currentWorkspace();
  if (!workspace) redirect("/ingresar");

  const subscription = ensureSubscription(workspace.id);
  const launch = getLaunchStatus(workspace.id);
  const notifications = listNotifications(workspace.id, 20);

  return (
    <AppShell
      user={{ full_name: user.full_name, email: user.email }}
      workspaceName={workspace.name}
      plan={subscription.plan}
      launchCompletion={launch.completion}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
