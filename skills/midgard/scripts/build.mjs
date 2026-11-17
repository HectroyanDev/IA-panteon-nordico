#!/usr/bin/env node
// Construye el snapshot y el HTML de Midgard a partir de las fuentes guardadas en el directorio de estado.
// Uso: node build.mjs --state-dir <dir> [--now <ISO>] [--next <ISO>] [--template <archivo>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readScene, resolveSource, nextRunFromCron, embedJson, writeFileAtomic, writeJsonAtomic,
} from "../../_shared/scenes/scene.mjs";
import { buildView, DEFAULT_MERGED_STATUSES, DEFAULT_REVIEW_STATUSES } from "./rules.mjs";
import { DATA_VALIDATORS } from "./schema.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TEMPLATE = path.join(HERE, "..", "assets", "template.html");
const SOURCES = ["jira", "github", "bitbucket"];

function parseDate(value, what) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`${what} no es una fecha válida: ${value}`);
  return d;
}

/** Función pura salvo la E/S del estado: `now` y `next` entran por argumento. Devuelve el snapshot y la ruta del HTML. */
export function build({ stateDir, now, next, template = DEFAULT_TEMPLATE }) {
  const scene = readScene(stateDir) ?? {};
  const sources = {};
  for (const name of SOURCES) sources[name] = resolveSource(stateDir, name, { validateData: DATA_VALIDATORS[name] });

  let nextRun = next ?? null;
  if (!nextRun && typeof scene.cron === "string") {
    try { nextRun = nextRunFromCron(scene.cron, now); } catch { nextRun = null; }
  }
  const mergedStatuses = Array.isArray(scene.jiraMergedStatuses) ? scene.jiraMergedStatuses : DEFAULT_MERGED_STATUSES;
  const reviewStatuses = Array.isArray(scene.jiraReviewStatuses) ? scene.jiraReviewStatuses : DEFAULT_REVIEW_STATUSES;
  const snapshot = buildView(sources, now, nextRun, { mergedStatuses, reviewStatuses });

  const html = embedJson(fs.readFileSync(template, "utf8"), snapshot);
  writeJsonAtomic(path.join(stateDir, "snapshot.json"), snapshot);
  const indexHtml = path.join(stateDir, "index.html");
  writeFileAtomic(indexHtml, html);
  return { snapshot, indexHtml };
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined) throw new Error(`argumento no válido: ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args["state-dir"]) throw new Error("falta --state-dir");
  const now = args.now ? parseDate(args.now, "--now") : new Date();
  const next = args.next ? parseDate(args.next, "--next") : undefined;
  const { snapshot, indexHtml } = build({ stateDir: args["state-dir"], now, next, template: args.template ?? DEFAULT_TEMPLATE });
  process.stdout.write(`${JSON.stringify({
    indexHtml, generatedAt: snapshot.generatedAt, nextRun: snapshot.nextRun, kpis: snapshot.kpis,
    sources: Object.fromEntries(snapshot.sources.map((s) => [s.name, s.ok ? "ok" : `caída: ${s.error}`])),
  })}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { main(process.argv.slice(2)); } catch (err) { process.stderr.write(`${err.message}\n`); process.exit(1); }
}
