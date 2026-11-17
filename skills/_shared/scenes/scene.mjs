// Librería compartida de escenas del panteón (ver skills/_shared/scenes.md).
// ESM, sin dependencias. Solo E/S de estado, validación de sobres, cron simple e incrustación segura.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SOURCE_NAME = /^[a-z][a-z0-9-]*$/;

/** Directorio de estado de una escena: ${XDG_STATE_HOME:-$HOME/.local/state}/nordic-pantheon/scenes/<escena>/ */
export function stateDir(scene, env = process.env, home = os.homedir()) {
  if (!SOURCE_NAME.test(String(scene))) throw new Error(`nombre de escena no válido: ${scene}`);
  const base = env.XDG_STATE_HOME && env.XDG_STATE_HOME.length > 0 ? env.XDG_STATE_HOME : path.join(home, ".local", "state");
  return path.join(base, "nordic-pantheon", "scenes", scene);
}

/** Escritura atómica: archivo temporal en el mismo directorio y rename. */
export function writeFileAtomic(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, contents);
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* nada */ }
    throw err;
  }
}

export function writeJsonAtomic(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Lee JSON; devuelve null si el archivo no existe o no es JSON válido. */
export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function readScene(dir) {
  return readJson(path.join(dir, "scene.json"));
}

export function writeScene(dir, scene) {
  writeJsonAtomic(path.join(dir, "scene.json"), scene);
}

export const DEFAULT_CRON = "0 8,14 * * 1-5";
export const DEFAULT_MERGED_STATUSES = ["Done (Merged in Dev)"];
export const DEFAULT_REVIEW_STATUSES = ["Under Review", "En Revisión"];

/** `scene.json` con la forma de D3. `bitbucketWorkspace` y `jiraSite` pueden ser null en escenas sin esas fuentes. */
export function createScene({ url, taskId, cron = DEFAULT_CRON, jiraSite = null, bitbucketWorkspace = null,
  jiraMergedStatuses = DEFAULT_MERGED_STATUSES, jiraReviewStatuses = DEFAULT_REVIEW_STATUSES, createdAt = new Date().toISOString() } = {}) {
  return { version: 1, url, taskId, cron, jiraSite, bitbucketWorkspace, jiraMergedStatuses: [...jiraMergedStatuses], jiraReviewStatuses: [...jiraReviewStatuses], createdAt };
}

/** Devuelve la lista de problemas de un `scene.json` (vacía si es válido). */
export function validateScene(scene) {
  const problems = [];
  if (scene === null || typeof scene !== "object" || Array.isArray(scene)) return ["scene.json no es un objeto"];
  if (scene.version !== 1) problems.push("version debe ser 1");
  if (typeof scene.url !== "string" || !/^https:\/\//.test(scene.url)) problems.push("url debe ser https");
  if (typeof scene.taskId !== "string" || scene.taskId === "") problems.push("taskId vacío");
  try { parseCron(scene.cron); } catch (e) { problems.push(e.message); }
  if (scene.jiraSite != null && (typeof scene.jiraSite.cloudId !== "string" || typeof scene.jiraSite.baseUrl !== "string")) problems.push("jiraSite necesita cloudId y baseUrl");
  if (scene.bitbucketWorkspace != null && typeof scene.bitbucketWorkspace !== "string") problems.push("bitbucketWorkspace debe ser texto");
  if (scene.jiraMergedStatuses !== undefined && !(Array.isArray(scene.jiraMergedStatuses) && scene.jiraMergedStatuses.every((x) => typeof x === "string"))) problems.push("jiraMergedStatuses debe ser una lista de textos");
  if (scene.jiraReviewStatuses !== undefined && !(Array.isArray(scene.jiraReviewStatuses) && scene.jiraReviewStatuses.every((x) => typeof x === "string"))) problems.push("jiraReviewStatuses debe ser una lista de textos");
  return problems;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Valida un sobre de fuente `{ source, ok, fetchedAt, error?, data? }`.
 * opts.source: nombre esperado. opts.validateData(data): devuelve texto de error o null.
 * Devuelve `{ valid: true }` o `{ valid: false, error }`.
 */
export function validateEnvelope(env, opts = {}) {
  if (!isObject(env)) return { valid: false, error: "respuesta no válida" };
  if (typeof env.source !== "string" || env.source === "") return { valid: false, error: "respuesta no válida" };
  if (opts.source && env.source !== opts.source) return { valid: false, error: "respuesta no válida" };
  if (typeof env.ok !== "boolean") return { valid: false, error: "respuesta no válida" };
  if (typeof env.fetchedAt !== "string" || Number.isNaN(Date.parse(env.fetchedAt))) return { valid: false, error: "respuesta no válida" };
  if (env.ok) {
    if (!isObject(env.data)) return { valid: false, error: "respuesta no válida" };
    if (opts.validateData) {
      const problem = opts.validateData(env.data);
      if (problem) return { valid: false, error: "respuesta no válida" };
    }
  } else if (typeof env.error !== "string" || env.error === "") {
    return { valid: false, error: "respuesta no válida" };
  }
  return { valid: true };
}

export function readEnvelope(file, opts = {}) {
  const env = readJson(file);
  if (env === null) return { envelope: null, valid: false, error: "sin respuesta" };
  const v = validateEnvelope(env, opts);
  return { envelope: v.valid ? env : null, valid: v.valid, error: v.valid ? undefined : v.error };
}

/**
 * Resuelve una fuente con la reserva de últimos datos válidos.
 * - sobre `ok` y válido: se copia a last-good/<fuente>.json y se usa.
 * - si no: se usa last-good (con su fecha en `usingDataFrom`) o nada.
 * Devuelve `{ data, status: { ok, fetchedAt?, error?, usingDataFrom? } }`.
 */
export function resolveSource(dir, source, opts = {}) {
  const o = { ...opts, source };
  const current = readEnvelope(path.join(dir, "sources", `${source}.json`), o);
  if (current.valid && current.envelope.ok) {
    writeJsonAtomic(path.join(dir, "last-good", `${source}.json`), current.envelope);
    return { data: current.envelope.data, status: { ok: true, fetchedAt: current.envelope.fetchedAt } };
  }
  let error;
  if (current.valid) error = current.envelope.error; // sobre válido con ok:false
  else if (current.error === "sin respuesta") error = "sin respuesta";
  else error = current.error;
  const prev = readEnvelope(path.join(dir, "last-good", `${source}.json`), o);
  if (prev.valid && prev.envelope.ok) {
    return { data: prev.envelope.data, status: { ok: false, error, usingDataFrom: prev.envelope.fetchedAt } };
  }
  return { data: null, status: { ok: false, error, usingDataFrom: null } };
}

// ---- cron simple: `M H[,H…] * * D[-D]` ----

function parseList(field, min, max, what) {
  const out = new Set();
  for (const part of field.split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(`cron no soportado (${what}): ${field}`);
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a > b || a < min || b > max) throw new Error(`cron fuera de rango (${what}): ${field}`);
    for (let i = a; i <= b; i++) out.add(i);
  }
  return [...out].sort((x, y) => x - y);
}

/** Interpreta `M H[,H…] * * D[-D]`; días 0-7 (0 y 7 = domingo) o `*`. */
export function parseCron(cron) {
  const f = String(cron).trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`cron no soportado: ${cron}`);
  const [min, hour, dom, mon, dow] = f;
  if (dom !== "*" || mon !== "*") throw new Error(`cron no soportado (día del mes y mes deben ser *): ${cron}`);
  if (!/^\d+$/.test(min)) throw new Error(`cron no soportado (minuto fijo): ${cron}`);
  const minute = Number(min);
  if (minute > 59) throw new Error(`cron fuera de rango (minuto): ${cron}`);
  const hours = parseList(hour, 0, 23, "horas");
  const days = dow === "*" ? [0, 1, 2, 3, 4, 5, 6] : [...new Set(parseList(dow, 0, 7, "días").map((d) => d % 7))].sort();
  return { minute, hours, days };
}

/** Primera hora del horario estrictamente posterior a `now` (hora local de la máquina). */
export function nextRunFromCron(cron, now) {
  const { minute, hours, days } = parseCron(cron);
  const start = new Date(now);
  for (let offset = 0; offset <= 8; offset++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    if (!days.includes(day.getDay())) continue;
    for (const h of hours) {
      const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, minute, 0, 0);
      if (candidate.getTime() > start.getTime()) return candidate;
    }
  }
  throw new Error(`el horario no tiene ninguna ejecución próxima: ${cron}`);
}

// ---- incrustación segura de JSON en la plantilla ----

export const SNAPSHOT_MARKER = "__SNAPSHOT_JSON__";

/** JSON apto para ir dentro de <script>: escapa <, > y & (y U+2028/2029). */
export function safeJson(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Sustituye el marcador de la plantilla por el JSON escapado. Falla si el marcador no está exactamente una vez. */
export function embedJson(template, data, marker = SNAPSHOT_MARKER) {
  const parts = template.split(marker);
  if (parts.length !== 2) throw new Error(`la plantilla debe contener ${marker} exactamente una vez`);
  return parts[0] + safeJson(data) + parts[1];
}
