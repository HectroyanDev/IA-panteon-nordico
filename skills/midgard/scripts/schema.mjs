// Validación de los datos de cada fuente de Midgard (el contenido de `data` de un sobre).
// Cada función devuelve un texto de error o null. Se pasan a `validateEnvelope(env, { validateData })`.

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.length > 0;
const isDate = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const isCount = (v) => Number.isInteger(v) && v >= 0;
const isHttps = (v) => typeof v === "string" && /^https:\/\//.test(v);

export function validateJiraData(data) {
  if (!isObj(data)) return "data no es un objeto";
  if (!isHttps(data.baseUrl)) return "baseUrl no es https";
  if (!Array.isArray(data.issues)) return "issues no es una lista";
  for (const [i, t] of data.issues.entries()) {
    if (!isObj(t)) return `issues[${i}] no es un objeto`;
    if (!isStr(t.key)) return `issues[${i}].key vacío`;
    if (typeof t.title !== "string") return `issues[${i}].title no es texto`;
    if (!isStr(t.status)) return `issues[${i}].status vacío`;
    if (!isStr(t.statusCategory)) return `issues[${i}].statusCategory vacío`;
    if (!isDate(t.updated)) return `issues[${i}].updated no es fecha`;
  }
  return null;
}

export function validatePrsData(data) {
  if (!isObj(data)) return "data no es un objeto";
  if (!Array.isArray(data.prs)) return "prs no es una lista";
  for (const [i, p] of data.prs.entries()) {
    const at = `prs[${i}]`;
    if (!isObj(p)) return `${at} no es un objeto`;
    if (p.host !== "github" && p.host !== "bitbucket") return `${at}.host no válido`;
    if (!isStr(p.repo)) return `${at}.repo vacío`;
    if (!Number.isInteger(p.number)) return `${at}.number no es entero`;
    if (!isHttps(p.url)) return `${at}.url no es https`;
    if (typeof p.title !== "string") return `${at}.title no es texto`;
    if (typeof p.branch !== "string") return `${at}.branch no es texto`;
    if (p.host === "bitbucket" && p.branch === "") return `${at}.branch vacío en Bitbucket (detalle de PR no leído)`;
    if (!["open", "merged", "declined"].includes(p.state)) return `${at}.state no válido`;
    if (typeof p.draft !== "boolean") return `${at}.draft no es booleano`;
    if (!isCount(p.approvals)) return `${at}.approvals no válido`;
    if (p.required !== null && !isCount(p.required)) return `${at}.required debe ser entero o null`;
    if (typeof p.approvedByPlatform !== "boolean") return `${at}.approvedByPlatform no es booleano`;
    if (!isCount(p.changesRequested)) return `${at}.changesRequested no válido`;
    if (p.unresolved !== null && !isCount(p.unresolved)) return `${at}.unresolved debe ser entero o null`;
    if (!Array.isArray(p.pending) || !p.pending.every((x) => typeof x === "string")) return `${at}.pending no es lista de textos`;
    if (!isDate(p.lastActivity)) return `${at}.lastActivity no es fecha`;
  }
  return null;
}

export const DATA_VALIDATORS = { jira: validateJiraData, github: validatePrsData, bitbucket: validatePrsData };
