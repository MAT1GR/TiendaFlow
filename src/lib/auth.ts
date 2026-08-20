import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "node:crypto";

import { all, get, nowIso, run } from "@/lib/db";
import type { User, Workspace } from "@/lib/types";

export const SESSION_COOKIE = "tf_session";
const SESSION_DAYS = 30;

/* -------------------------------------------------------------------------- */
/* Password hashing (scrypt, sin dependencias externas)                       */
/* -------------------------------------------------------------------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

/* -------------------------------------------------------------------------- */
/* Firma de la cookie de sesión                                               */
/* -------------------------------------------------------------------------- */

function sessionSecret(): string {
  const secret = process.env.TIENDAFLOW_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta TIENDAFLOW_SESSION_SECRET. Definilo antes de iniciar en producción.",
    );
  }
  // Solo desarrollo: constante estable para que la sesión sobreviva a los reloads.
  return "tiendaflow-dev-secret-no-usar-en-produccion";
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

function serializeToken(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function parseToken(token: string | undefined): string | null {
  if (!token) return null;
  const index = token.lastIndexOf(".");
  if (index <= 0) return null;
  const sessionId = token.slice(0, index);
  const signature = token.slice(index + 1);
  const expected = sign(sessionId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return sessionId;
}

/* -------------------------------------------------------------------------- */
/* Sesiones                                                                    */
/* -------------------------------------------------------------------------- */

export async function createSession(userId: string, userAgent?: string) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  run(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    userId,
    expiresAt.toISOString(),
    userAgent ?? null,
    nowIso(),
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, serializeToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const sessionId = parseToken(store.get(SESSION_COOKIE)?.value);
  if (sessionId) run(`DELETE FROM sessions WHERE id = ?`, sessionId);
  store.delete(SESSION_COOKIE);
}

/** Usuario autenticado o `null`. Cacheado por request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const sessionId = parseToken(store.get(SESSION_COOKIE)?.value);
  if (!sessionId) return null;

  const session = get<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM sessions WHERE id = ?`,
    sessionId,
  );
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    run(`DELETE FROM sessions WHERE id = ?`, sessionId);
    return null;
  }

  return get<User>(
    `SELECT id, email, full_name, avatar_url, provider, onboarding_completed,
            onboarding_answers, created_at, updated_at
     FROM users WHERE id = ?`,
    session.user_id,
  );
});

/** Workspace activo del usuario. Un usuario pertenece al menos a uno. */
export const currentWorkspace = cache(
  async (): Promise<Workspace | null> => {
    const user = await currentUser();
    if (!user) return null;
    return get<Workspace>(
      `SELECT w.* FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
       WHERE m.user_id = ?
       ORDER BY w.created_at ASC
       LIMIT 1`,
      user.id,
    );
  },
);

export interface Session {
  user: User;
  workspace: Workspace;
}

/**
 * Contexto autenticado. Lanza si no hay sesión: los layouts protegidos
 * redirigen antes, así que llegar acá sin sesión es un error de programación.
 */
export async function requireSession(): Promise<Session> {
  const user = await currentUser();
  const workspace = await currentWorkspace();
  if (!user || !workspace) {
    throw new Error("UNAUTHENTICATED");
  }
  return { user, workspace };
}

export async function userWorkspaces(userId: string): Promise<Workspace[]> {
  return all<Workspace>(
    `SELECT w.* FROM workspaces w
     JOIN workspace_members m ON m.workspace_id = w.id
     WHERE m.user_id = ? ORDER BY w.created_at ASC`,
    userId,
  );
}

/* -------------------------------------------------------------------------- */
/* Recuperación de contraseña                                                  */
/* -------------------------------------------------------------------------- */

export function createPasswordResetToken(userId: string): string {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  run(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    userId,
    tokenHash,
    new Date(Date.now() + 3600_000).toISOString(),
    nowIso(),
  );
  return token;
}

export function consumePasswordResetToken(token: string): string | null {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = get<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
    tokenHash,
  );
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  run(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`, nowIso(), row.id);
  return row.user_id;
}
