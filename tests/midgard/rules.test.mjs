process.env.TZ = "Europe/Madrid";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMergedInDev, isInReview, matchKeys, prStatus, reviewSummary, businessDaysBetween, isStale, coherenceWarning,
  buildView, DEFAULT_MERGED_STATUSES, DEFAULT_REVIEW_STATUSES, STALE_BUSINESS_DAYS, RECENT_DAYS,
} from "../../skills/midgard/scripts/rules.mjs";

const pr = (o = {}) => ({
  host: "github", repo: "o/r", number: 1, url: "https://github.com/o/r/pull/1", title: "", branch: "", state: "open", draft: false,
  approvals: 0, required: null, approvedByPlatform: false, changesRequested: 0, unresolved: null, pending: [],
  lastActivity: "2026-11-16T12:00:00Z", ...o,
});
const bbPr = (o = {}) => pr({ host: "bitbucket", repo: "ws/r", url: "https://bitbucket.org/ws/r/pull-requests/1", required: null, unresolved: null, ...o });
const ticket = (o = {}) => ({ key: "ICM-1", title: "t", status: "In Progress", statusCategory: "indeterminate", updated: "2026-11-16T12:00:00Z", mergedInDev: false, ...o });
const NOW = new Date("2026-11-17T08:00:00Z"); // martes 09:00 Madrid
const ok = (data) => ({ data, status: { ok: true } });
const down = (error = "caída", usingDataFrom = null) => ({ data: null, status: { ok: false, error, usingDataFrom } });
const jiraWith = (issues) => ok({ baseUrl: "https://j.atlassian.net", issues });
const view = (issues, prsGh = [], prsBb = [], opts = {}) =>
  buildView({ jira: jiraWith(issues), github: ok({ prs: prsGh }), bitbucket: ok({ prs: prsBb }) }, NOW, null, opts);
const rowsOf = (v) => v.panels.flatMap((p) => p.rows);

test("constantes", () => {
  assert.equal(STALE_BUSINESS_DAYS, 5);
  assert.equal(RECENT_DAYS, 90);
  assert.deepEqual(DEFAULT_MERGED_STATUSES, ["Done (Merged in Dev)"]);
});

// ---- estados de revisión ----
test("isInReview: nombre completo normalizado, lista por defecto y vacía", () => {
  assert.deepEqual(DEFAULT_REVIEW_STATUSES, ["Under Review", "En Revisión"]);
  for (const s of ["Under Review", "En Revisión", "under review", "  EN   revisión ", " under  review "]) assert.equal(isInReview(s, DEFAULT_REVIEW_STATUSES), true, s);
  for (const s of ["Review blocked", "En Revision", "In Progress", ""]) assert.equal(isInReview(s, DEFAULT_REVIEW_STATUSES), false, s);
  assert.equal(isInReview("Under Review", []), false);
  assert.equal(isInReview("En Revisión"), true);
});
test("aviso 2: En Revisión sin PR abierta, con ese nombre en el texto; [] lo desactiva", () => {
  const r = coherenceWarning(ticket({ status: "En Revisión" }), []);
  assert.equal(r.warning.code, 2);
  assert.match(r.warning.text, /En Revisión/);
  assert.equal(coherenceWarning(ticket({ status: "En Revisión" }), [pr({ state: "open" })]).warning, null);
  assert.equal(coherenceWarning(ticket({ status: "Under Review" }), [], [], []).warning, null);
  const v = view([ticket({ key: "ICM-7", status: "En Revisión" })], [], [], { reviewStatuses: [] });
  assert.equal(v.noPr[0].warning, null);
  const d = view([ticket({ key: "ICM-7", status: "En Revisión" })]);
  assert.equal(d.noPr[0].warning.code, 2);
  assert.match(d.noPr[0].warning.text, /En Revisión/);
});

// ---- mergeado en dev ----
test("isMergedInDev: nombre exacto, otras mayúsculas y espacios de más", () => {
  assert.equal(isMergedInDev("Done (Merged in Dev)", DEFAULT_MERGED_STATUSES), true);
  assert.equal(isMergedInDev("done (merged in dev)", DEFAULT_MERGED_STATUSES), true);
  assert.equal(isMergedInDev("  Done  (Merged   in Dev) ", DEFAULT_MERGED_STATUSES), true);
});
test("isMergedInDev: nombres parecidos y lista vacía no casan", () => {
  assert.equal(isMergedInDev("Merged", DEFAULT_MERGED_STATUSES), false);
  assert.equal(isMergedInDev("Not merged", DEFAULT_MERGED_STATUSES), false);
  assert.equal(isMergedInDev("Done (Merged in Dev) bis", DEFAULT_MERGED_STATUSES), false);
  assert.equal(isMergedInDev("Done (Merged in Dev)", []), false);
  assert.equal(isMergedInDev("", DEFAULT_MERGED_STATUSES), false);
});

// ---- unión ----
test("matchKeys: rama, título, prefijo y varias claves", () => {
  assert.deepEqual(matchKeys(pr({ branch: "feature/icm-123-reintentos" }), ["ICM-123"]), ["ICM-123"]);
  assert.deepEqual(matchKeys(pr({ title: "ICM-123: reintentos", branch: "x" }), ["ICM-123"]), ["ICM-123"]);
  assert.deepEqual(matchKeys(pr({ branch: "feature/ICM-1234" }), ["ICM-123"]), []);
  assert.deepEqual(matchKeys(pr({ branch: "feature/ICM-12" }), ["ICM-123"]), []);
  assert.deepEqual(matchKeys(pr({ title: "ICM-1 e ICM-2 juntos" }), ["ICM-1", "ICM-2", "ICM-3"]), ["ICM-1", "ICM-2"]);
  assert.deepEqual(matchKeys(pr({ branch: "XICM-1" }), ["ICM-1"]), []);
});

// ---- estados ----
test("prStatus: los seis estados en su orden", () => {
  assert.equal(prStatus(pr({ state: "merged", draft: true, changesRequested: 1 })).label, "Mergeada");
  assert.equal(prStatus(pr({ state: "declined" })).label, "Cerrada sin merge");
  assert.equal(prStatus(pr({ draft: true, changesRequested: 1, approvals: 2, required: 2 })).label, "Borrador");
  assert.equal(prStatus(pr({ changesRequested: 1, approvals: 2, required: 2 })).label, "Cambios pedidos");
  assert.equal(prStatus(pr({ approvals: 2, required: 2 })).label, "Lista para merge");
  assert.equal(prStatus(pr({ approvals: 1, required: 2 })).label, "Esperando revisión");
});
test("prStatus: requeridas desconocidas usan el veredicto de la plataforma", () => {
  assert.equal(prStatus(pr({ approvals: 1, required: null, approvedByPlatform: false })).code, "waiting");
  assert.equal(prStatus(pr({ approvals: 1, required: null, approvedByPlatform: true })).code, "ready");
});
test("prStatus: GitHub con required conocido sigue comparando approvals >= required", () => {
  assert.equal(prStatus(pr({ approvals: 1, required: 2, approvedByPlatform: true })).code, "waiting");
  assert.equal(prStatus(pr({ approvals: 3, required: 2, approvedByPlatform: false })).code, "ready");
});
test("Bitbucket: una aprobación basta aunque queden revisores; cambios pedidos gana; sin aprobaciones espera", () => {
  const a = bbPr({ approvals: 1, approvedByPlatform: true, pending: ["acastro"] });
  assert.equal(prStatus(a).label, "Lista para merge");
  assert.deepEqual(reviewSummary(a), ["1 aprob.", "→ acastro"]);
  assert.equal(prStatus(bbPr({ approvals: 1, approvedByPlatform: true, changesRequested: 1 })).label, "Cambios pedidos");
  assert.equal(prStatus(bbPr({ approvals: 0, approvedByPlatform: false })).label, "Esperando revisión");
});

// ---- revisión ----
test("reviewSummary completa y con nulos", () => {
  assert.deepEqual(reviewSummary(pr({ approvals: 1, required: 2, unresolved: 3, pending: ["lmartin"] })), ["1/2 aprob.", "3 sin resolver", "→ lmartin"]);
  assert.deepEqual(reviewSummary(bbPr({ approvals: 2, approvedByPlatform: true })), ["2 aprob."]);
  assert.deepEqual(reviewSummary(pr({ state: "merged" })), []);
  assert.ok(!reviewSummary(bbPr({ approvals: 2 })).join(" ").match(/null|undefined|\?/));
});

// ---- días laborables y estancamiento ----
test("businessDaysBetween: 5 días, fin de semana, mismo día y orden inverso", () => {
  assert.equal(businessDaysBetween("2026-11-09T12:00:00Z", "2026-11-16T09:00:00Z"), 5);
  assert.equal(businessDaysBetween("2026-11-13T12:00:00Z", "2026-11-16T09:00:00Z"), 1);
  assert.equal(businessDaysBetween("2026-11-16T08:00:00Z", "2026-11-16T15:00:00Z"), 0);
  assert.equal(businessDaysBetween("2026-11-17T12:00:00Z", "2026-11-16T09:00:00Z"), 0);
  assert.equal(businessDaysBetween("2026-11-14T12:00:00Z", "2026-11-15T12:00:00Z"), 0);
});
test("isStale solo en PRs abiertas y tickets sin PR", () => {
  assert.equal(isStale({ kind: "pr", state: "open", days: 5 }), true);
  assert.equal(isStale({ kind: "pr", state: "open", days: 4 }), false);
  assert.equal(isStale({ kind: "pr", state: "merged", days: 8 }), false);
  assert.equal(isStale({ kind: "ticket", days: 5 }), true);
});
test("buildView: PR mergeada con 8 días muestra días y no se marca; ticket sin PR con 5 días se marca", () => {
  const v = view([ticket({ key: "ICM-1" }), ticket({ key: "ICM-2", updated: "2026-11-10T12:00:00Z" })],
    [pr({ branch: "ICM-1", state: "merged", lastActivity: "2026-11-05T12:00:00Z" })]);
  const r = rowsOf(v)[0];
  assert.equal(r.pr.days, 8); assert.equal(r.pr.stale, false);
  assert.equal(v.noPr[0].days, 5); assert.equal(v.noPr[0].stale, true);
});

// ---- avisos ----
const warn = (t, prs, inc = []) => coherenceWarning(ticket(t), prs, inc).warning?.code ?? null;
test("aviso 1: al menos una mergeada y ninguna abierta; las cerradas sin merge no cuentan", () => {
  assert.equal(warn({}, [pr({ state: "merged" })]), 1);
  assert.equal(warn({}, [pr({ state: "merged" }), pr({ state: "declined" })]), 1);
  assert.equal(warn({}, [pr({ state: "merged" }), pr({ state: "open" })]), null);
  assert.equal(warn({}, [pr({ state: "declined" })]), null);
});
test("aviso 2: Under Review sin PR abierta (no el 1 si solo hay cerrada sin merge)", () => {
  assert.equal(warn({ status: "Under Review" }, [pr({ state: "declined" })]), 2);
  assert.equal(warn({ status: "under  review" }, []), 2);
  assert.equal(warn({ status: "Under Review" }, [pr({ state: "open" })]), null);
});
test("aviso 3: categoría To Do (To Do o Backlog) con PR abierta", () => {
  assert.equal(warn({ status: "To Do", statusCategory: "new" }, [pr()]), 3);
  assert.equal(warn({ status: "Backlog", statusCategory: "new" }, [pr()]), 3);
  assert.equal(warn({ status: "Backlog", statusCategory: "new" }, []), null);
});
test("ticket coherente: In Progress con PR abierta no avisa", () => {
  assert.equal(warn({}, [pr()]), null);
});
test("mergeado en dev: sin aviso 1, sí avisos 2 y 3", () => {
  assert.equal(warn({ status: "Done (Merged in Dev)", mergedInDev: true }, [pr({ state: "merged" })]), null);
  assert.equal(warn({ status: "Under Review", mergedInDev: true }, []), 2);
  assert.equal(warn({ status: "X", statusCategory: "new", mergedInDev: true }, [pr()]), 3);
});
test("aviso con fuente caída sin datos: 1 y 2 pasan a incompleto, 3 se muestra igual", () => {
  const r1 = coherenceWarning(ticket(), [pr({ state: "merged" })], ["GitHub"]);
  assert.equal(r1.warning, null); assert.deepEqual(r1.incomplete, ["GitHub"]);
  const r2 = coherenceWarning(ticket({ status: "Under Review" }), [], ["GitHub"]);
  assert.equal(r2.warning, null); assert.deepEqual(r2.incomplete, ["GitHub"]);
  const r3 = coherenceWarning(ticket({ status: "To Do", statusCategory: "new" }), [pr()], ["GitHub"]);
  assert.equal(r3.warning.code, 3); assert.deepEqual(r3.incomplete, []);
});

// ---- buildView ----
test("buildView: mergeado en dev con PR mergeada → etiqueta, sin aviso, cuenta en curso y no en avisos", () => {
  const issues = [ticket({ key: "ICM-9", status: "Done (Merged in Dev)" })];
  const v = view(issues, [pr({ branch: "ICM-9", state: "merged" })]);
  const r = rowsOf(v)[0];
  assert.equal(r.mergedInDev, true); assert.equal(r.warning, null);
  assert.equal(v.kpis.inProgress, 1); assert.equal(v.kpis.warned, 0);
});
test("buildView: mismo ticket con mergedStatuses [] → aviso 1 y sin etiqueta", () => {
  const v = view([ticket({ key: "ICM-9", status: "Done (Merged in Dev)" })], [pr({ branch: "ICM-9", state: "merged" })], [], { mergedStatuses: [] });
  const r = rowsOf(v)[0];
  assert.equal(r.mergedInDev, false); assert.equal(r.warning.code, 1);
  assert.equal(v.kpis.warned, 1);
});
test("buildView: mergeado en dev sin PR y con 5 días → Sin PR, etiqueta y estancado", () => {
  const v = view([ticket({ key: "ICM-8", status: "Done (Merged in Dev)", updated: "2026-11-10T12:00:00Z" })]);
  assert.equal(v.noPr.length, 1);
  assert.equal(v.noPr[0].mergedInDev, true); assert.equal(v.noPr[0].stale, true); assert.equal(v.noPr[0].days, 5);
  assert.equal(v.kpis.stale, 1);
});
test("buildView: tickets Done no aparecen; tickets de otros no existen en la fuente", () => {
  const v = view([ticket({ key: "ICM-1", statusCategory: "done", status: "Done" }), ticket({ key: "ICM-2" })]);
  assert.deepEqual(v.noPr.map((r) => r.key), ["ICM-2"]);
});
test("buildView: ticket en dos repositorios aparece en los dos paneles con su PR", () => {
  const v = view([ticket({ key: "ICM-1405" })], [
    pr({ repo: "o/payments-api", number: 1, url: "https://github.com/o/payments-api/pull/1", branch: "ICM-1405" }),
    pr({ repo: "o/web-checkout", number: 2, url: "https://github.com/o/web-checkout/pull/2", branch: "ICM-1405" })]);
  assert.deepEqual(v.panels.map((p) => p.repo).sort(), ["o/payments-api", "o/web-checkout"]);
  assert.ok(v.panels.every((p) => p.rows.length === 1 && p.rows[0].key === "ICM-1405"));
  assert.equal(v.panels[0].hostLabel, "GitHub");
});
test("buildView: varias PRs en el mismo repo → una fila por PR y un solo aviso", () => {
  const v = view([ticket({ key: "ICM-1", status: "To Do", statusCategory: "new" })], [
    pr({ number: 1, url: "https://github.com/o/r/pull/1", branch: "ICM-1" }),
    pr({ number: 2, url: "https://github.com/o/r/pull/2", branch: "ICM-1" })]);
  const rows = v.panels[0].rows;
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((r) => r.warning).length, 1);
});
test("buildView: PR con dos claves aparece en las dos filas y se cuenta una vez", () => {
  const v = view([ticket({ key: "ICM-1" }), ticket({ key: "ICM-2" })], [pr({ title: "ICM-1 ICM-2 juntos" })]);
  assert.equal(rowsOf(v).length, 2);
  assert.equal(v.kpis.openPrs, 1);
  assert.equal(v.kpis.waiting, 1);
});
test("buildView: cifras", () => {
  const v = view(
    [ticket({ key: "ICM-1" }), ticket({ key: "ICM-2", status: "To Do", statusCategory: "new" }), ticket({ key: "ICM-3", updated: "2026-11-06T12:00:00Z" }), ticket({ key: "ICM-4" })],
    [pr({ number: 1, url: "https://github.com/o/r/pull/1", branch: "ICM-1", lastActivity: "2026-11-06T12:00:00Z" }),
      pr({ number: 2, url: "https://github.com/o/r/pull/2", branch: "ICM-2", changesRequested: 1 }),
      pr({ number: 3, url: "https://github.com/o/r/pull/3", branch: "ICM-4", state: "merged" })]);
  assert.deepEqual(v.kpis, { inProgress: 4, openPrs: 2, waiting: 1, changes: 1, stale: 2, warned: 2 });
});
test("buildView: panel ordenado por filas y luego nombre", () => {
  const v = view([ticket({ key: "ICM-1" }), ticket({ key: "ICM-2" }), ticket({ key: "ICM-3" })], [
    pr({ repo: "o/b", number: 1, url: "https://github.com/o/b/pull/1", branch: "ICM-1" }),
    pr({ repo: "o/a", number: 2, url: "https://github.com/o/a/pull/2", branch: "ICM-2" }),
    pr({ repo: "o/b", number: 3, url: "https://github.com/o/b/pull/3", branch: "ICM-3" })]);
  assert.deepEqual(v.panels.map((p) => p.repo), ["o/b", "o/a"]);
});
test("buildView: GitHub caído sin datos → Sin PR con incompleto y sin aviso 2; aviso 3 se mantiene", () => {
  const v = buildView({
    jira: jiraWith([ticket({ key: "ICM-1", status: "Under Review" }), ticket({ key: "ICM-2", status: "To Do", statusCategory: "new" })]),
    github: down("gh sin sesión"), bitbucket: ok({ prs: [bbPr({ branch: "ICM-2", approvals: 0 })] }),
  }, NOW, null);
  const r = v.noPr.find((x) => x.key === "ICM-1");
  assert.deepEqual(r.incomplete, ["GitHub"]); assert.equal(r.warning, null);
  assert.equal(rowsOf(v).find((x) => x.key === "ICM-2").warning.code, 3);
  assert.equal(v.sources.find((s) => s.name === "github").ok, false);
});
test("buildView: fuente caída con last-good no es incompleta", () => {
  const v = buildView({
    jira: jiraWith([ticket({ key: "ICM-1", status: "Under Review" })]),
    github: { data: { prs: [] }, status: { ok: false, error: "x", usingDataFrom: "2026-11-16T10:00:00Z" } }, bitbucket: ok({ prs: [] }),
  }, NOW, null);
  assert.deepEqual(v.noPr[0].incomplete, []);
  assert.equal(v.noPr[0].warning.code, 2);
});
test("buildView: Jira sin datos → cifras null y sin filas; sin tickets → cifras a cero y empty", () => {
  const d = buildView({ jira: down("MCP caído"), github: ok({ prs: [] }), bitbucket: ok({ prs: [] }) }, NOW, null);
  assert.equal(d.kpis, null); assert.equal(d.jiraDown, true); assert.equal(d.empty, false);
  const e = view([]);
  assert.deepEqual(e.kpis, { inProgress: 0, openPrs: 0, waiting: 0, changes: 0, stale: 0, warned: 0 }); assert.equal(e.empty, true);
});
test("buildView: determinista y con nextRun", () => {
  const a = JSON.stringify(view([ticket()], [pr({ branch: "ICM-1" })]));
  assert.equal(a, JSON.stringify(view([ticket()], [pr({ branch: "ICM-1" })])));
  const n = new Date("2026-11-17T13:00:00Z");
  assert.equal(buildView({ jira: jiraWith([]), github: ok({ prs: [] }), bitbucket: ok({ prs: [] }) }, NOW, n).nextRun, n.toISOString());
});
