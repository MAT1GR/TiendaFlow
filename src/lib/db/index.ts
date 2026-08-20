import "server-only";

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Conexión única a SQLite.
 *
 * En desarrollo Next.js recarga los módulos, así que guardamos la instancia en
 * `globalThis` para no abrir un handle nuevo en cada hot reload.
 */

type Row = Record<string, unknown>;

const DB_PATH =
  process.env.TIENDAFLOW_DB_PATH ??
  path.join(process.cwd(), "data", "tiendaflow.db");

const globalRef = globalThis as unknown as {
  __tiendaflowDb?: DatabaseSync;
};

function bootstrap(): DatabaseSync {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const database = new DatabaseSync(DB_PATH);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  database.exec(schema);
  migrate(database);

  return database;
}

/**
 * Migraciones incrementales.
 *
 * `schema.sql` usa `CREATE TABLE IF NOT EXISTS`, así que una columna nueva no
 * llega nunca a una base que ya existe. Acá agregamos las que falten, mirando
 * primero `PRAGMA table_info` para que correrlo dos veces no rompa nada.
 *
 * Regla: las columnas nuevas van siempre con `DEFAULT`, porque SQLite no admite
 * agregar una columna `NOT NULL` sin valor por defecto a una tabla con filas.
 */
function migrate(database: DatabaseSync) {
  const ADDITIONS: Array<{ table: string; column: string; definition: string }> = [
    { table: "orders", column: "commission_rate", definition: "REAL NOT NULL DEFAULT 0" },
    { table: "orders", column: "commission_amount", definition: "REAL NOT NULL DEFAULT 0" },
    { table: "orders", column: "paid_at", definition: "TEXT" },
  ];

  for (const { table, column, definition } of ADDITIONS) {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (columns.length === 0) continue; // la tabla todavía no existe
    if (columns.some((info) => info.name === column)) continue;
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.info(`[tiendaflow] migración: ${table}.${column} agregada.`);
  }
}

export function db(): DatabaseSync {
  if (!globalRef.__tiendaflowDb) {
    globalRef.__tiendaflowDb = bootstrap();
  }
  return globalRef.__tiendaflowDb;
}

type Param = string | number | bigint | null | Uint8Array;

function normalize(params: unknown[]): Param[] {
  return params.map((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint" ||
      value instanceof Uint8Array
    ) {
      return value;
    }
    return JSON.stringify(value);
  });
}

/**
 * `node:sqlite` devuelve filas con prototipo nulo. React Server Components se
 * niega a serializar esos objetos hacia Client Components, así que las pasamos
 * a objetos planos antes de que salgan de esta capa.
 */
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return db()
    .prepare(sql)
    .all(...normalize(params))
    .map((row) => plain<T>(row));
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | null {
  const row = db().prepare(sql).get(...normalize(params));
  return row === undefined || row === null ? null : plain<T>(row);
}

export function run(sql: string, ...params: unknown[]) {
  return db().prepare(sql).run(...normalize(params));
}

/** Ejecuta `fn` dentro de una transacción; revierte si lanza. */
export function transaction<T>(fn: () => T): T {
  const database = db();
  database.exec("BEGIN");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
