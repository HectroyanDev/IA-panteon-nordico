import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  stateDir, writeFileAtomic, readScene, writeScene, validateEnvelope, readEnvelope,
  resolveSource, nextRunFromCron, embedJson, safeJson, writeJsonAtomic, createScene, validateScene,
} from "../../skills/_shared/scenes/scene.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "scene-test-"));

test("stateDir usa XDG_STATE_HOME si existe", () => {
  assert.equal(stateDir("midgard", { XDG_STATE_HOME: "/x/state" }, "/home/u"), "/x/state/nordic-pantheon/scenes/midgard");
});

test("stateDir sin XDG_STATE_HOME o vacío usa ~/.local/state", () => {
  const want = "/home/u/.local/state/nordic-pantheon/scenes/midgard";
  assert.equal(stateDir("midgard", {}, "/home/u"), want);
  assert.equal(stateDir("midgard", { XDG_STATE_HOME: "" }, "/home/u"), want);
});

test("stateDir rechaza nombres de escena con ruta", () => {
  assert.throws(() => stateDir("../x", {}, "/h"));
});

test("escritura atómica: no deja temporales y reemplaza el contenido", () => {
  const dir = tmp();
  const f = path.join(dir, "a", "scene.json");
  writeFileAtomic(f, "uno");
  writeFileAtomic(f, "dos");
  assert.equal(fs.readFileSync(f, "utf8"), "dos");
  assert.deepEqual(fs.readdirSync(path.dirname(f)), ["scene.json"]);
});

test("readScene/writeScene hacen ida y vuelta; readScene sin archivo da null", () => {
  const dir = tmp();
  assert.equal(readScene(dir), null);
  writeScene(dir, { version: 1, url: "https://x" });
  assert.deepEqual(readScene(dir), { version: 1, url: "https://x" });
});

const okEnv = (source, fetchedAt = "2026-11-16T15:02:00Z") => ({ source, ok: true, fetchedAt, data: { n: 1 } });

test("validateEnvelope acepta sobres ok y caídos", () => {
  assert.equal(validateEnvelope(okEnv("jira")).valid, true);
  assert.equal(validateEnvelope({ source: "jira", ok: false, fetchedAt: "2026-11-16T15:02:00Z", error: "x" }).valid, true);
});

test("validateEnvelope rechaza sobres mal formados", () => {
  for (const bad of [null, [], {}, { source: "jira", ok: true, fetchedAt: "no", data: {} },
    { source: "jira", ok: true, fetchedAt: "2026-11-16T15:02:00Z" },
    { source: "jira", ok: false, fetchedAt: "2026-11-16T15:02:00Z" },
    { source: "jira", ok: "si", fetchedAt: "2026-11-16T15:02:00Z", data: {} }]) {
    assert.equal(validateEnvelope(bad).valid, false);
  }
  assert.equal(validateEnvelope(okEnv("github"), { source: "jira" }).valid, false);
  assert.equal(validateEnvelope(okEnv("jira"), { validateData: () => "mal" }).valid, false);
});

test("resolveSource: sobre válido se usa y se copia a last-good", () => {
  const dir = tmp();
  writeJsonAtomic(path.join(dir, "sources", "github.json"), okEnv("github"));
  const r = resolveSource(dir, "github");
  assert.deepEqual(r.data, { n: 1 });
  assert.deepEqual(r.status, { ok: true, fetchedAt: "2026-11-16T15:02:00Z" });
  assert.equal(readEnvelope(path.join(dir, "last-good", "github.json")).valid, true);
});

test("resolveSource: sobre no válido → fuente caída y last-good con su fecha", () => {
  const dir = tmp();
  writeJsonAtomic(path.join(dir, "last-good", "github.json"), okEnv("github", "2026-11-15T10:00:00Z"));
  fs.mkdirSync(path.join(dir, "sources"), { recursive: true });
  fs.writeFileSync(path.join(dir, "sources", "github.json"), "{ no es json");
  const r = resolveSource(dir, "github");
  assert.deepEqual(r.data, { n: 1 });
  assert.equal(r.status.ok, false);
  assert.equal(r.status.usingDataFrom, "2026-11-15T10:00:00Z");
});

test("resolveSource: ok:false con motivo propio y sin last-good", () => {
  const dir = tmp();
  writeJsonAtomic(path.join(dir, "sources", "github.json"),
    { source: "github", ok: false, fetchedAt: "2026-11-16T15:02:00Z", error: "gh sin sesión" });
  const r = resolveSource(dir, "github");
  assert.equal(r.data, null);
  assert.deepEqual(r.status, { ok: false, error: "gh sin sesión", usingDataFrom: null });
});

test("resolveSource: sobre válido ausente → error y reserva; sobre de otra fuente no vale", () => {
  const dir = tmp();
  writeJsonAtomic(path.join(dir, "sources", "jira.json"), okEnv("github"));
  const r = resolveSource(dir, "jira");
  assert.equal(r.status.ok, false);
  assert.equal(r.status.error, "respuesta no válida");
  assert.equal(r.status.usingDataFrom, null);
});

const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi, 0, 0);
const hm = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

test("nextRunFromCron con 0 8,14 * * 1-5 (casos de D11)", () => {
  const c = "0 8,14 * * 1-5";
  // 2026-11-16 es lunes
  assert.deepEqual(hm(nextRunFromCron(c, at(2026, 11, 16, 7, 0))), [2026, 11, 16, 8, 0]);
  assert.deepEqual(hm(nextRunFromCron(c, at(2026, 11, 17, 8, 3))), [2026, 11, 17, 14, 0]);
  assert.deepEqual(hm(nextRunFromCron(c, at(2026, 11, 18, 14, 0))), [2026, 11, 19, 8, 0]);
  assert.deepEqual(hm(nextRunFromCron(c, at(2026, 11, 19, 15, 0))), [2026, 11, 20, 8, 0]);
  assert.deepEqual(hm(nextRunFromCron(c, at(2026, 11, 20, 14, 2))), [2026, 11, 23, 8, 0]);
  assert.deepEqual(hm(nextRunFromCron(c, at(2026, 11, 21, 10, 0))), [2026, 11, 23, 8, 0]);
});

test("nextRunFromCron: cambio de mes y horario temporal de prueba", () => {
  assert.deepEqual(hm(nextRunFromCron("0 10,16 * * 1-5", at(2026, 11, 30, 16, 5))), [2026, 12, 1, 10, 0]);
});

test("nextRunFromCron rechaza expresiones que no sabe calcular", () => {
  for (const bad of ["*/5 * * * *", "0 8 1 * *", "0 8 * * MON", "0 25 * * *", "0 8 * *"]) {
    assert.throws(() => nextRunFromCron(bad, new Date()), bad);
  }
});

test("embedJson escapa < > & y </script>", () => {
  const out = embedJson("<script>__SNAPSHOT_JSON__</script>", { t: "</script><img src=x onerror=alert(1)> & $&" });
  assert.equal(out.includes("</script><img"), false);
  assert.equal((out.match(/<\/script>/g) || []).length, 1);
  assert.ok(out.includes("\\u003c/script\\u003e"));
  assert.ok(out.includes("\\u0026"));
  assert.ok(out.includes("$\\u0026")); // sin patrones de String.replace
  const json = out.slice("<script>".length, -"</script>".length);
  assert.equal(JSON.parse(json).t, "</script><img src=x onerror=alert(1)> & $&");
});

test("embedJson falla si el marcador falta o está repetido", () => {
  assert.throws(() => embedJson("sin marcador", {}));
  assert.throws(() => embedJson("__SNAPSHOT_JSON__ __SNAPSHOT_JSON__", {}));
  assert.equal(safeJson({ a: "\u2028" }).includes("\u2028"), false);
});

test("createScene da la forma de D3 y validateScene la acepta", () => {
  const s = createScene({ url: "https://claude.ai/artifact/x", taskId: "nordic-pantheon-midgard",
    jiraSite: { cloudId: "c", baseUrl: "https://j.atlassian.net" }, bitbucketWorkspace: "casfidIdasfest", createdAt: "2026-11-17T08:00:00Z" });
  assert.deepEqual(Object.keys(s), ["version", "url", "taskId", "cron", "jiraSite", "bitbucketWorkspace", "jiraMergedStatuses", "jiraReviewStatuses", "createdAt"]);
  assert.equal(s.cron, "0 8,14 * * 1-5");
  assert.deepEqual(s.jiraMergedStatuses, ["Done (Merged in Dev)"]);
  assert.deepEqual(s.jiraReviewStatuses, ["Under Review", "En Revisión"]);
  assert.deepEqual(validateScene(s), []);
});

test("validateScene: jiraReviewStatuses ausente vale; lista con no-texto o no lista se rechaza", () => {
  const base = createScene({ url: "https://claude.ai/artifact/x", taskId: "t" });
  const { jiraReviewStatuses, ...without } = base;
  assert.deepEqual(validateScene(without), []);
  assert.deepEqual(validateScene({ ...base, jiraReviewStatuses: [] }), []);
  assert.ok(validateScene({ ...base, jiraReviewStatuses: ["Under Review", 3] }).length > 0);
  assert.ok(validateScene({ ...base, jiraReviewStatuses: "Under Review" }).length > 0);
});

test("validateScene detecta problemas", () => {
  assert.ok(validateScene(null).length > 0);
  assert.ok(validateScene({ version: 1, url: "http://x", taskId: "", cron: "*/5 * * * *", jiraMergedStatuses: "x" }).length >= 4);
});
