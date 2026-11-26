#!/usr/bin/env node
// Clasifica las PRs candidatas del modo `nightly` de Tyr. Función pura, sin red.
// Uso (CLI): node classify.mjs --in gh.json --in bb.json --out plan.json [--max 10]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_LINES = 1500;
export const MAX_PER_NIGHT = 10;

export const CATEGORIES = ["review", "rereview", "skip-draft", "skip-reviewed", "skip-ignored-only", "too-large", "skip-too-large-notified"];

const LOCKFILES = new Set([
  "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock",
  "composer.lock", "Gemfile.lock", "poetry.lock", "Pipfile.lock", "uv.lock", "Cargo.lock", "go.sum", "pubspec.lock",
]);
const IGNORED_DIRS = ["vendor", "node_modules", "dist", "build", "__generated__"];
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|tgz|woff2?|ttf|otf|eot|mp4|mov|mp3|wasm|jar|bin)$/i;

/** Archivos que Tyr no revisa (y que no cuentan para el límite de tamaño). */
export function isIgnoredPath(p) {
  const base = p.split("/").pop();
  if (LOCKFILES.has(base) || base.endsWith(".lock")) return true;
  if (p.split("/").slice(0, -1).some((d) => IGNORED_DIRS.includes(d))) return true;
  if (/\.min\.[^/]+$/.test(base)) return true;
  if (/\.generated\.|\.pb\.go$|_pb2\.py$|\.snap$/.test(base)) return true;
  return BINARY_EXT.test(base);
}

/** Suma añadidas + borradas de los archivos no ignorados. `files`: [{ filename, additions, deletions }]. */
export function countChangedLines(files) {
  return files.filter((f) => !isIgnoredPath(f.filename)).reduce((n, f) => n + (f.additions ?? 0) + (f.deletions ?? 0), 0);
}

const MIN_SHA = 7;

/** Compara SHA por prefijo (minúsculas, mínimo 7 caracteres cada uno): el SHA corto de un resumen coincide con el head completo. */
export function shaMatches(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x.length < MIN_SHA || y.length < MIN_SHA) return false;
  return x.startsWith(y) || y.startsWith(x);
}

/**
 * Categoría de una PR candidata (ya abierta y con revisión pedida a Héctor o revisada por Tyr).
 * `lastTyrSha`: SHA de la última revisión firmada por Tyr, o null.
 * `skip-ignored-only`: 0 líneas revisables (solo lockfiles, generados, etc.); no se revisa ni se aprueba.
 */
export function classifyPr({ draft, changedLines, headSha, lastTyrSha = null, reviewedManually = false, tooLargeNotified = false }) {
  if (draft) return "skip-draft";
  if (reviewedManually) return "skip-reviewed";
  if (lastTyrSha && shaMatches(lastTyrSha, headSha)) return "skip-reviewed";
  if (changedLines === 0) return "skip-ignored-only";
  if (changedLines > MAX_LINES) return tooLargeNotified ? "skip-too-large-notified" : "too-large";
  return lastTyrSha ? "rereview" : "review";
}

/**
 * Clasifica todas las candidatas y reparte el trabajo de la noche: `todo` (review, rereview y too-large,
 * de la más antigua a la más nueva, hasta `max`), `deferred` (el resto) y `skipped`.
 */
export function planNight(candidates, { max = MAX_PER_NIGHT } = {}) {
  const seen = new Set();
  const classified = [];
  for (const c of candidates) {
    if (!c?.url || seen.has(c.url)) continue;
    seen.add(c.url);
    classified.push({ ...c, category: classifyPr(c) });
  }
  const actionable = classified
    .filter((c) => ["review", "rereview", "too-large"].includes(c.category))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || a.url.localeCompare(b.url));
  return {
    todo: actionable.slice(0, max),
    deferred: actionable.slice(max),
    skipped: classified.filter((c) => c.category.startsWith("skip-")),
  };
}

function main(argv) {
  const ins = [];
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined) throw new Error(`argumento no válido: ${argv[i]}`);
    if (argv[i] === "--in") ins.push(argv[i + 1]); else args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!ins.length) throw new Error("falta --in");
  const candidates = ins.flatMap((f) => {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    if (j.ok === false) throw new Error(`${f}: fuente con error: ${j.error}`);
    return Array.isArray(j) ? j : j.prs ?? [];
  });
  const max = args.max ? Number(args.max) : MAX_PER_NIGHT;
  const plan = planNight(candidates, { max });
  const text = `${JSON.stringify(plan, null, 2)}\n`;
  if (args.out) fs.writeFileSync(args.out, text); else process.stdout.write(text);
  process.stdout.write(`${JSON.stringify({ todo: plan.todo.length, deferred: plan.deferred.length, skipped: plan.skipped.length })}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { main(process.argv.slice(2)); } catch (err) { process.stderr.write(`${err.message}\n`); process.exit(1); }
}
