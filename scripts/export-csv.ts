/**
 * NeuroSync — export the SQLite database to CSV
 *
 * Usage:  npm run db:export-csv
 *         npm run db:export-csv -- path/to/output-folder
 *
 * Writes one CSV per table into exports/neurosync-<date>_<time>/ (or the folder
 * given). The database is opened read-only, so this is safe while the app runs.
 *
 * Left out on purpose:
 *   - session_tokens table: live sign-in tokens; anyone holding one is signed in.
 *   - users.password_hash: credential data, not useful in a spreadsheet.
 *
 * The CSVs contain personal and child data. Keep them private (exports/ is gitignored).
 */

import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

const EXCLUDED_TABLES = new Set(["session_tokens"]);
const EXCLUDED_COLUMNS: Record<string, string[]> = {
  users: ["password_hash"],
};

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "neurosync.db");

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/** Quote a value for CSV (RFC 4180): wrap in quotes when needed, double inner quotes. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Buffer.isBuffer(value) ? value.toString("base64") : String(value);
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function main(): void {
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}. Set DB_PATH or run from the project folder.`);
    process.exit(1);
  }

  const outDir = path.resolve(process.argv[2] ?? path.join("exports", `neurosync-${timestamp()}`));
  mkdirSync(outDir, { recursive: true });

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const tables = (db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as Array<{ name: string }>).map((row) => row.name);

    console.log(`Exporting ${DB_PATH}\n  -> ${outDir}\n`);
    for (const table of tables) {
      if (EXCLUDED_TABLES.has(table)) {
        console.log(`  skipped  ${table} (contains live sign-in tokens)`);
        continue;
      }
      const skip = new Set(EXCLUDED_COLUMNS[table] ?? []);
      const columns = (db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>)
        .map((col) => col.name)
        .filter((name) => !skip.has(name));
      const selectList = columns.map((name) => `"${name}"`).join(", ");
      const rows = db.prepare(`SELECT ${selectList} FROM "${table}"`).raw().all() as unknown[][];

      const lines = [columns.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
      // BOM so Excel reads UTF-8 (Hindi/Marathi text) correctly.
      writeFileSync(path.join(outDir, `${table}.csv`), "﻿" + lines.join("\r\n") + "\r\n", "utf8");
      const note = skip.size ? ` (without ${[...skip].join(", ")})` : "";
      console.log(`  ${String(rows.length).padStart(6)} rows  ${table}.csv${note}`);
    }
  } finally {
    db.close();
  }
  console.log("\nDone. These files contain personal data; keep them private.");
}

main();
