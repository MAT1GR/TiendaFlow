"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { logoutAction } from "@/app/actions/auth";
import { markNotificationsReadAction } from "@/app/actions/settings";
import { searchAction, type SearchHit } from "@/app/actions/search";
import { CREATE_MENU } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, Dropdown, MenuItem, Spinner } from "@/components/ui/primitives";
import { cn, relativeTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";

export function Topbar({
  user,
  notifications,
  onOpenMenu,
  onOpenCopilot,
}: {
  user: { full_name: string; email: string };
  notifications: Notification[];
  onOpenMenu: () => void;
  onOpenCopilot: () => void;
}) {
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-ink-200 bg-white/85 px-3 backdrop-blur-md sm:px-5">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Icon name="menu" size={20} />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button variant="ai" size="sm" icon="sparkles" onClick={onOpenCopilot} className="hidden sm:inline-flex">
          TiendaFlow AI
        </Button>
        <button
          type="button"
          onClick={onOpenCopilot}
          className="tf-gradient-ai grid size-9 place-items-center rounded-xl text-white sm:hidden"
          aria-label="Abrir TiendaFlow AI"
        >
          <Icon name="sparkles" size={17} />
        </button>

        <CreateMenu />
        <NotificationsMenu notifications={notifications} unread={unread} />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        setHits(await searchAction(query));
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timeout);
  }, [query]);

  const groups = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    (acc[hit.group] ??= []).push(hit);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar productos, ofertas, funnels, ventas…"
          aria-label="Búsqueda global"
          className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50/70 pl-9 pr-14 text-[13.5px] text-ink-900 placeholder:text-ink-400 transition-colors hover:bg-white focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-ink-400 sm:block">
          ⌘K
        </kbd>
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="tf-rise absolute left-0 right-0 top-11 z-50 max-h-[60vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white p-2 shadow-[0_24px_48px_-20px_rgba(15,23,42,.35)]">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-ink-500">
              <Spinner size={14} /> Buscando…
            </div>
          ) : hits.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-ink-500">
              No encontramos nada con “{query}”.
            </p>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
                  {group}
                </p>
                {items.map((hit) => (
                  <Link
                    key={`${hit.group}-${hit.id}`}
                    href={hit.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-ink-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink-900">
                        {hit.title}
                      </span>
                      <span className="block truncate text-[12px] text-ink-500">{hit.subtitle}</span>
                    </span>
                    <Icon name="arrowUpRight" size={14} className="shrink-0 text-ink-300" />
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CreateMenu() {
  return (
    <Dropdown
      trigger={(open) => (
        <span
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-700",
            open && "bg-brand-700",
          )}
        >
          <Icon name="plus" size={16} />
          <span className="hidden sm:inline">Crear</span>
        </span>
      )}
      className="w-72"
    >
      {(close) => (
        <>
          <Link
            href="/app/ia"
            onClick={close}
            className="tf-gradient-ai mb-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-white"
            role="menuitem"
          >
            <Icon name="sparkles" size={16} />
            Crear con IA
            <Icon name="arrowRight" size={14} className="ml-auto" />
          </Link>
          {CREATE_MENU.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={close}
              role="menuitem"
              className="flex items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-ink-100"
            >
              <Icon name={item.icon} size={16} className="mt-0.5 text-ink-400" />
              <span>
                <span className="block text-[13.5px] font-medium text-ink-900">{item.label}</span>
                <span className="block text-[12px] text-ink-500">{item.hint}</span>
              </span>
            </Link>
          ))}
        </>
      )}
    </Dropdown>
  );
}

/* -------------------------------------------------------------------------- */

function NotificationsMenu({
  notifications,
  unread,
}: {
  notifications: Notification[];
  unread: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dropdown
      trigger={() => (
        <span className="relative grid size-9 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800">
          <Icon name="bell" size={18} />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 grid min-w-[15px] place-items-center rounded-full bg-brand-600 px-1 text-[9.5px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
      )}
      className="w-80"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[13px] font-semibold text-ink-900">Notificaciones</p>
        {unread > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await markNotificationsReadAction();
                router.refresh();
              })
            }
            className="text-[12px] font-medium text-brand-700 hover:text-brand-800 disabled:opacity-60"
          >
            Marcar leídas
          </button>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-ink-500">
            Todo tranquilo por acá. Cuando pase algo importante te avisamos.
          </p>
        ) : (
          notifications.map((item) => (
            <Link
              key={item.id}
              href={item.href ?? "/app"}
              className={cn(
                "block rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-100",
                !item.read_at && "bg-brand-50/50",
              )}
            >
              <div className="flex items-start gap-2">
                {!item.read_at ? (
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
                ) : (
                  <span className="mt-1.5 size-1.5 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink-900">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">
                      {item.body}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-[11px] text-ink-400">
                    {relativeTime(item.created_at)}
                  </span>
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </Dropdown>
  );
}

/* -------------------------------------------------------------------------- */

function AccountMenu({ user }: { user: { full_name: string; email: string } }) {
  return (
    <Dropdown
      trigger={() => (
        <span className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-ink-100">
          <Avatar name={user.full_name} size={30} />
        </span>
      )}
    >
      <div className="border-b border-ink-100 px-3 pb-2.5 pt-1.5">
        <p className="truncate text-[13.5px] font-semibold text-ink-900">{user.full_name}</p>
        <p className="truncate text-[12px] text-ink-500">{user.email}</p>
      </div>
      <div className="pt-1.5">
        <MenuItem icon="settings" href="/app/configuracion">
          Configuración
        </MenuItem>
        <MenuItem icon="card" href="/app/pagos">
          Pagos
        </MenuItem>
        <MenuItem icon="rocket" href="/app/lanzamiento">
          Modo Lanzamiento
        </MenuItem>
        <form action={logoutAction}>
          <button
            type="submit"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
          >
            <Icon name="logout" size={16} className="text-ink-400" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </Dropdown>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="warning" className="uppercase tracking-wide">
      Demo
    </Badge>
  );
}
