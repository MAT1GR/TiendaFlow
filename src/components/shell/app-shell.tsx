"use client";

import { useState, type ReactNode } from "react";

import { BottomNav } from "@/components/shell/bottom-nav";
import { Copilot } from "@/components/shell/copilot";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ToastProvider } from "@/components/ui/primitives";
import type { ProductNavEntry } from "@/lib/product-nav";
import type { Notification } from "@/lib/types";

export function AppShell({
  user,
  workspaceName,
  plan,
  notifications,
  products,
  children,
}: {
  user: { full_name: string; email: string };
  workspaceName: string;
  plan: string;
  notifications: Notification[];
  products: ProductNavEntry[];
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
          products={products}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        {/*
          `group/shell` existe para que la barra de abajo pueda preguntar si la
          pantalla actual es de las que ocupan todo el ancho. Las que lo son
          —hoy, el constructor de la página— traen su propia barra de acciones
          pegada abajo, y dos barras apiladas en un teléfono se comen un tercio
          de la pantalla.
        */}
        <div className="group/shell flex min-w-0 flex-1 flex-col">
          {/*
            El buscador, "Crear" y las notificaciones no entran en el
            constructor de la página.
            Es una pantalla de foco: se entra a hacer una cosa y se sale. Su
            propia barra ya tiene la flecha para volver, y ofrecer ahí mismo
            "crear un producto" o buscar un cliente invita a irse justo cuando
            la persona está en la mitad de algo sin guardar.
          */}
          <Topbar
            user={user}
            notifications={notifications}
            onOpenMenu={() => setMenuOpen(true)}
            onOpenCopilot={() => setCopilotOpen(true)}
            className="group-has-[[data-fullbleed]]/shell:hidden"
          />
          {/*
            Casi todas las pantallas viven dentro de una columna centrada de
            1400px. El editor de landings no: ahí la vista previa y los dos
            paneles tienen que llegar hasta los bordes de la ventana, porque
            cada píxel que se va en margen es píxel que no ve el vendedor de su
            propia página. Una página pide ese trato marcando su raíz con
            `data-fullbleed` y el contenedor se corre solo.
          */}
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-6 has-[[data-fullbleed]]:max-w-none has-[[data-fullbleed]]:p-0 sm:px-6 lg:px-8 lg:pb-6">
            {children}
          </main>

          <div className="group-has-[[data-fullbleed]]/shell:hidden">
            <BottomNav onMore={() => setMenuOpen(true)} />
          </div>
        </div>
      </div>

      <Copilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </ToastProvider>
  );
}
