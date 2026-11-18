// Reglas de Midgard: funciones puras, sin E/S ni lectura del reloj (la hora entra por argumento).

export const STALE_BUSINESS_DAYS = 5;
export const RECENT_DAYS = 90;
export const DEFAULT_REVIEW_STATUSES = ["Under Review", "En Revisión"];
export const DEFAULT_MERGED_STATUSES = ["Done (Merged in Dev)"];

export const STATUS_LABELS = {
  merged: "Mergeada",
  declined: "Cerrada sin merge",
  draft: "Borrador",
  changes: "Cambios pedidos",
  ready: "Lista para merge",
  waiting: "Esperando revisión",
};

const normName = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Igualdad normalizada (recortar, colapsar espacios, sin mayúsculas); no subcadenas ni regex. */
export function isMergedInDev(status, mergedStatuses = DEFAULT_MERGED_STATUSES) {
  const list = Array.isArray(mergedStatuses) ? mergedStatuses : DEFAULT_MERGED_STATUSES;
  const n = normName(status);
  return n !== "" && list.some((m) => normName(m) === n);
}

/** Igual que `isMergedInDev`, con la lista de estados de revisión (`jiraReviewStatuses`). */
export function isInReview(status, reviewStatuses = DEFAULT_REVIEW_STATUSES) {
  const list = Array.isArray(reviewStatuses) ? reviewStatuses : DEFAULT_REVIEW_STATUSES;
  const n = normName(status);
  return n !== "" && list.some((m) => normName(m) === n);
}

/** Claves de `keys` que aparecen en la rama o el título de la PR como palabra completa, sin mayúsculas. */
export function matchKeys(pr, keys) {
  const text = `${pr.branch ?? ""}\n${pr.title ?? ""}`;
  return keys.filter((k) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(k)}(?![0-9])`, "i").test(text));
}

/** Estado único de la PR, en el orden de la spec. */
export function prStatus(pr) {
  let code;
  if (pr.state === "merged") code = "merged";
  else if (pr.state === "declined") code = "declined";
  else if (pr.draft) code = "draft";
  else if (pr.changesRequested > 0) code = "changes";
  else {
    const enough = pr.required != null ? pr.approvals >= pr.required : pr.approvedByPlatform === true;
    code = enough ? "ready" : "waiting";
  }
  return { code, label: STATUS_LABELS[code] };
}

/** Partes de la revisión de una PR abierta; un dato que la plataforma no da (null) se omite. */
export function reviewSummary(pr) {
  if (pr.state !== "open") return [];
  const parts = [];
  parts.push(pr.required != null ? `${pr.approvals}/${pr.required} aprob.` : `${pr.approvals} aprob.`);
  if (pr.changesRequested > 0) parts.push(`${pr.changesRequested} pide${pr.changesRequested === 1 ? "" : "n"} cambios`);
  if (pr.unresolved != null && pr.unresolved > 0) parts.push(`${pr.unresolved} sin resolver`);
  if (Array.isArray(pr.pending) && pr.pending.length > 0) parts.push(`→ ${pr.pending.join(", ")}`);
  return parts;
}

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Días lunes-viernes en (from, to] por fecha local; `from` posterior a `to` → 0. */
export function businessDaysBetween(from, to) {
  const a = dayStart(new Date(from));
  const b = dayStart(new Date(to));
  let n = 0;
  for (let d = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1); d <= b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

/** Estancada: PR abierta o ticket sin PR con 5 o más días laborables quieto. */
export function isStale(row) {
  const applies = row.kind === "ticket" ? true : row.state === "open";
  return applies && row.days >= STALE_BUSINESS_DAYS;
}

const isTodoCategory = (t) => t.statusCategory === "new";

/**
 * Avisos de coherencia Jira↔repo (casos 1–3) y marca de incompleto.
 * `incompleteHosts`: fuentes de PRs caídas sin datos previos. Los casos 1 y 2 dependen de que no haya PR abierta,
 * así que con fuentes incompletas no se afirman: se devuelve `incomplete`. El caso 3 se apoya en una PR visible.
 * Devuelve `{ warning: { code, text } | null, incomplete: [hosts] }`.
 */
export function coherenceWarning(ticket, prs, incompleteHosts = [], reviewStatuses = DEFAULT_REVIEW_STATUSES) {
  const hasOpen = prs.some((p) => p.state === "open");
  const hasMerged = prs.some((p) => p.state === "merged");
  const case1 = !ticket.mergedInDev && hasMerged && !hasOpen;
  const case2 = isInReview(ticket.status, reviewStatuses) && !hasOpen;
  const case3 = isTodoCategory(ticket) && hasOpen;
  if ((case1 || case2) && incompleteHosts.length > 0) return { warning: null, incomplete: [...incompleteHosts] };
  if (case1) return { warning: { code: 1, text: `Sus PRs están mergeadas y Jira sigue en ${ticket.status}. Revisa si el ticket debería avanzar.` }, incomplete: [] };
  if (case2) return { warning: { code: 2, text: `Está en ${ticket.status} sin ninguna PR abierta.` }, incomplete: [] };
  if (case3) return { warning: { code: 3, text: `Hay una PR abierta y el ticket sigue en ${ticket.status}.` }, incomplete: [] };
  return { warning: null, incomplete: [] };
}

function stalePrUrls(rows) {
  const urls = new Set();
  for (const r of rows) for (const repo of r.repos) for (const p of repo.prs) if (p.stale) urls.add(p.url);
  return urls.size;
}

const SOURCE_LABELS = { jira: "Jira", github: "GitHub", bitbucket: "Bitbucket" };
const HOST_LABELS = { github: "GitHub", bitbucket: "Bitbucket" };

/**
 * Modelo de vista (snapshot). `sources`: `{ jira, github, bitbucket }`, cada uno `{ data, status }` (de `resolveSource`).
 * `now` y `nextRun`: Date (nextRun puede ser null). Sin lecturas del reloj: mismo argumento, mismo resultado.
 */
export function buildView(sources, now, nextRun, { mergedStatuses, reviewStatuses } = {}) {
  const merged = mergedStatuses === undefined ? DEFAULT_MERGED_STATUSES : mergedStatuses;
  const review = reviewStatuses === undefined ? DEFAULT_REVIEW_STATUSES : reviewStatuses;
  const jira = sources.jira ?? { data: null, status: { ok: false, error: "sin datos", usingDataFrom: null } };
  const jiraDown = jira.data === null;

  const srcInfo = ["jira", "github", "bitbucket"].map((name) => {
    const s = sources[name] ?? { data: null, status: { ok: false, error: "sin datos", usingDataFrom: null } };
    return {
      name, label: SOURCE_LABELS[name], ok: s.status.ok === true, error: s.status.error ?? null,
      fetchedAt: s.status.fetchedAt ?? null, usingDataFrom: s.status.usingDataFrom ?? null,
      hasData: s.data !== null,
    };
  });
  const incompleteHosts = ["github", "bitbucket"].filter((h) => (sources[h]?.data ?? null) === null).map((h) => HOST_LABELS[h]);

  const allPrs = [...(sources.github?.data?.prs ?? []), ...(sources.bitbucket?.data?.prs ?? [])];
  const baseUrl = jira.data?.baseUrl ?? null;
  const tickets = (jira.data?.issues ?? [])
    .filter((t) => t.statusCategory !== "done")
    .map((t) => ({ ...t, mergedInDev: isMergedInDev(t.status, merged) }));
  const keys = tickets.map((t) => t.key);

  const linked = new Map(); // key -> PRs
  for (const t of tickets) linked.set(t.key, []);
  for (const pr of allPrs) for (const k of matchKeys(pr, keys)) linked.get(k).push(pr);

  const prRow = (t, pr, first, warn) => {
    const st = prStatus(pr);
    const days = businessDaysBetween(pr.lastActivity, now);
    return {
      key: t.key, ticketUrl: baseUrl ? `${baseUrl}/browse/${t.key}` : null, title: t.title,
      status: t.status,
      pr: {
        number: pr.number, url: pr.url, title: pr.title, branch: pr.branch, state: pr.state, draft: pr.draft,
        statusCode: st.code, statusLabel: st.label, review: reviewSummary(pr), days,
        stale: isStale({ kind: "pr", state: pr.state, days }),
      },
      days,
      warning: first && warn.warning ? { ...warn.warning, ticketUrl: baseUrl ? `${baseUrl}/browse/${t.key}` : null, prs: linkedPrLinks(t) } : null,
      incomplete: [],
    };
  };
  const linkedPrLinks = (t) => (linked.get(t.key) ?? []).map((p) => ({ number: p.number, url: p.url }));

  const panelsMap = new Map();
  const noPrRows = [];
  const mergedDevRows = [];
  const warnedKeys = new Set();
  let mergedDevStaleNoPr = 0;
  for (const t of tickets) {
    const prs = [...linked.get(t.key)].sort((a, b) => a.number - b.number);
    const warn = coherenceWarning(t, prs, incompleteHosts, review);
    if (warn.warning) warnedKeys.add(t.key);
    if (t.mergedInDev) {
      // Los tickets mergeados en dev no entran en `panels` ni en `noPr`: van a su propio bloque, una fila por ticket.
      const ticketUrl = baseUrl ? `${baseUrl}/browse/${t.key}` : null;
      const byRepo = new Map();
      for (const pr of prs) {
        const pk = `${pr.host}:${pr.repo}`;
        if (!byRepo.has(pk)) byRepo.set(pk, { host: pr.host, hostLabel: HOST_LABELS[pr.host], repo: pr.repo, prs: [] });
        const st = prStatus(pr);
        const days = businessDaysBetween(pr.lastActivity, now);
        byRepo.get(pk).prs.push({
          number: pr.number, url: pr.url, state: pr.state, statusCode: st.code, statusLabel: st.label, days,
          stale: isStale({ kind: "pr", state: pr.state, days }),
        });
      }
      const ticketDays = prs.length === 0 ? businessDaysBetween(t.updated, now) : null;
      const noPrStale = prs.length === 0 && isStale({ kind: "ticket", days: ticketDays });
      if (noPrStale) mergedDevStaleNoPr++;
      const repos = [...byRepo.values()];
      mergedDevRows.push({
        key: t.key, ticketUrl, title: t.title, status: t.status, repos, days: ticketDays,
        stale: noPrStale || repos.some((r) => r.prs.some((p) => p.stale)),
        warning: warn.warning ? { ...warn.warning, ticketUrl, prs: linkedPrLinks(t) } : null,
        incomplete: prs.length === 0 ? [...incompleteHosts] : warn.incomplete,
      });
      continue;
    }
    if (prs.length === 0) {
      const days = businessDaysBetween(t.updated, now);
      noPrRows.push({
        key: t.key, ticketUrl: baseUrl ? `${baseUrl}/browse/${t.key}` : null, title: t.title, status: t.status,
        pr: null, days, stale: isStale({ kind: "ticket", days }),
        warning: warn.warning ? { ...warn.warning, ticketUrl: baseUrl ? `${baseUrl}/browse/${t.key}` : null, prs: [] } : null,
        incomplete: incompleteHosts.length > 0 ? [...incompleteHosts] : [],
      });
      continue;
    }
    const seenPanels = new Set();
    for (const pr of prs) {
      const pk = `${pr.host}:${pr.repo}`;
      const first = !seenPanels.has(pk);
      seenPanels.add(pk);
      if (!panelsMap.has(pk)) panelsMap.set(pk, { host: pr.host, hostLabel: HOST_LABELS[pr.host], repo: pr.repo, rows: [] });
      const row = prRow(t, pr, first, warn);
      row.incomplete = first ? warn.incomplete : [];
      panelsMap.get(pk).rows.push(row);
    }
  }
  const panels = [...panelsMap.values()].sort((a, b) => b.rows.length - a.rows.length || a.repo.localeCompare(b.repo));
  // Repositorios de las filas mergeadas en dev: primero los que tienen panel, en su orden, y luego el resto por nombre.
  const panelIdx = new Map(panels.map((p, i) => [`${p.host}:${p.repo}`, i]));
  const rank = (r) => panelIdx.get(`${r.host}:${r.repo}`) ?? Infinity;
  for (const row of mergedDevRows) row.repos.sort((a, b) => (rank(a) === rank(b) ? a.repo.localeCompare(b.repo) : rank(a) - rank(b)));

  // Cifras: PRs únicas por URL.
  const uniq = new Map();
  for (const t of tickets) for (const pr of linked.get(t.key)) uniq.set(pr.url, pr);
  const open = [...uniq.values()].filter((p) => p.state === "open");
  const count = (code) => open.filter((p) => prStatus(p).code === code).length;
  const stalePrs = open.filter((p) => isStale({ kind: "pr", state: "open", days: businessDaysBetween(p.lastActivity, now) })).length;
  const staleNoPr = noPrRows.filter((r) => r.stale).length + mergedDevStaleNoPr;
  const kpis = jiraDown ? null : {
    inProgress: tickets.length, openPrs: open.length, waiting: count("waiting"), changes: count("changes"),
    stale: stalePrs + staleNoPr, warned: warnedKeys.size,
  };

  return {
    version: 1,
    generatedAt: now.toISOString(),
    nextRun: nextRun ? nextRun.toISOString() : null,
    staleDays: STALE_BUSINESS_DAYS,
    jiraDown,
    empty: !jiraDown && tickets.length === 0,
    sources: srcInfo,
    kpis,
    panels,
    noPr: noPrRows,
    mergedDev: mergedDevRows,
    mergedDevSummary: {
      total: mergedDevRows.length,
      // Unidades de la cifra de estancadas: PRs abiertas estancadas únicas por URL y tickets sin PR estancados.
      stale: stalePrUrls(mergedDevRows) + mergedDevStaleNoPr,
      warned: mergedDevRows.filter((r) => r.warning).length,
    },
  };
}
