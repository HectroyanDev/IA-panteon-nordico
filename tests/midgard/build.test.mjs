process.env.TZ = "Europe/Madrid";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build, DEFAULT_TEMPLATE } from "../../skills/midgard/scripts/build.mjs";
import { writeJsonAtomic } from "../../skills/_shared/scenes/scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, "..", "fixtures", "midgard");
const MIN_TEMPLATE = path.join(FIX, "template.min.html");
const NOW = new Date("2026-11-17T08:00:00Z"); // martes 09:00 Madrid
const templates = [["plantilla mínima", MIN_TEMPLATE]];
if (fs.existsSync(DEFAULT_TEMPLATE)) templates.push(["plantilla real", DEFAULT_TEMPLATE]);

function stateWith({ skip = [], scene } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "midgard-build-"));
  for (const s of ["jira", "github", "bitbucket"]) {
    if (skip.includes(s)) continue;
    fs.mkdirSync(path.join(dir, "sources"), { recursive: true });
    fs.copyFileSync(path.join(FIX, `${s}.json`), path.join(dir, "sources", `${s}.json`));
  }
  if (scene) writeJsonAtomic(path.join(dir, "scene.json"), scene);
  return dir;
}
const SCENE = { version: 1, url: "https://claude.ai/artifact/x", taskId: "t", cron: "0 8,14 * * 1-5", jiraSite: { cloudId: "c", baseUrl: "https://j" }, bitbucketWorkspace: "casfidIdasfest", jiraMergedStatuses: ["Done (Merged in Dev)"], jiraReviewStatuses: ["Under Review", "En Revisión"], createdAt: "2026-11-17T07:00:00Z" };
const embedded = (html) => JSON.parse(/<script type="application\/json" id="snapshot">([\s\S]*?)<\/script>/.exec(html)[1]);
const rows = (snap) => snap.panels.flatMap((p) => p.rows);
const run = (opts, tpl) => { const r = build({ now: NOW, template: tpl, ...opts }); return { ...r, html: fs.readFileSync(r.indexHtml, "utf8") }; };

for (const [label, tpl] of templates) {
  test(`${label}: HTML idéntico en dos construcciones`, () => {
    const dir = stateWith({ scene: SCENE });
    const a = run({ stateDir: dir }, tpl).html;
    const b = run({ stateDir: dir }, tpl).html;
    assert.equal(a, b);
    assert.ok(fs.existsSync(path.join(dir, "snapshot.json")));
  });

  test(`${label}: título peligroso escapado en el HTML y recuperable como texto`, () => {
    const { html } = run({ stateDir: stateWith({ scene: SCENE }) }, tpl);
    assert.equal(html.includes("<img src=x onerror=alert(1)>"), false);
    assert.equal(html.includes("</script><script>alert(2)"), false);
    const snap = embedded(html);
    const row = snap.noPr.concat(rows(snap)).find((r) => r.key === "ICM-1490");
    assert.ok(row.title.includes("<img src=x onerror=alert(1)>") && row.title.includes("</script>"));
  });

  test(`${label}: GitHub caído con last-good muestra sus PRs con su fecha; sin last-good queda incompleto`, () => {
    const dir = stateWith({ scene: SCENE });
    run({ stateDir: dir }, tpl); // crea last-good
    writeJsonAtomic(path.join(dir, "sources", "github.json"), { source: "github", ok: false, fetchedAt: "2026-11-17T08:00:00Z", error: "gh sin sesión" });
    const withPrev = embedded(run({ stateDir: dir }, tpl).html);
    const gh = withPrev.sources.find((s) => s.name === "github");
    assert.equal(gh.ok, false); assert.equal(gh.error, "gh sin sesión"); assert.equal(gh.usingDataFrom, "2026-11-17T07:59:00Z");
    assert.ok(rows(withPrev).some((r) => r.pr.url.startsWith("https://github.com/")));

    const dir2 = stateWith({ scene: SCENE, skip: ["github"] });
    writeJsonAtomic(path.join(dir2, "sources", "github.json"), { source: "github", ok: false, fetchedAt: "2026-11-17T08:00:00Z", error: "gh sin sesión" });
    const noPrev = embedded(run({ stateDir: dir2 }, tpl).html);
    assert.equal(noPrev.sources.find((s) => s.name === "github").usingDataFrom, null);
    assert.ok(noPrev.noPr.length > 0 && noPrev.noPr.every((r) => r.incomplete.includes("GitHub")));
    assert.equal(rows(noPrev).some((r) => r.pr.url.startsWith("https://github.com/")), false);
  });

  test(`${label}: Jira sin datos → cifras nulas y aviso de fuente`, () => {
    const dir = stateWith({ scene: SCENE, skip: ["jira"] });
    const snap = embedded(run({ stateDir: dir }, tpl).html);
    assert.equal(snap.kpis, null); assert.equal(snap.jiraDown, true);
    assert.equal(snap.sources.find((s) => s.name === "jira").ok, false);
  });

  test(`${label}: sin tickets`, () => {
    const dir = stateWith({ scene: SCENE });
    const env = JSON.parse(fs.readFileSync(path.join(dir, "sources", "jira.json"), "utf8"));
    env.data.issues = [];
    writeJsonAtomic(path.join(dir, "sources", "jira.json"), env);
    const snap = embedded(run({ stateDir: dir }, tpl).html);
    assert.equal(snap.empty, true); assert.equal(snap.kpis.inProgress, 0);
  });

  test(`${label}: --next ausente se calcula desde scene.json.cron`, () => {
    const dir = stateWith({ scene: SCENE });
    const snap = embedded(run({ stateDir: dir, now: new Date("2026-11-20T13:02:00Z") }, tpl).html); // viernes 14:02 Madrid
    assert.equal(new Date(snap.nextRun).toISOString(), new Date(2026, 10, 23, 8, 0).toISOString());
    const given = new Date("2026-11-17T13:03:00Z");
    assert.equal(embedded(run({ stateDir: dir, next: given }, tpl).html).nextRun, given.toISOString());
  });

  test(`${label}: jiraMergedStatuses de scene.json (ausente → por defecto; [] → sin etiqueta y con aviso 1)`, () => {
    const { jiraMergedStatuses, ...withoutKey } = SCENE;
    const def = embedded(run({ stateDir: stateWith({ scene: withoutKey }) }, tpl).html);
    const r1470 = rows(def).find((r) => r.key === "ICM-1470");
    assert.equal(r1470.mergedInDev, true); assert.equal(r1470.warning, null);
    const empty = embedded(run({ stateDir: stateWith({ scene: { ...SCENE, jiraMergedStatuses: [] } }) }, tpl).html);
    const e1470 = rows(empty).find((r) => r.key === "ICM-1470");
    assert.equal(e1470.mergedInDev, false); assert.equal(e1470.warning.code, 1);
  });

  test(`${label}: jiraReviewStatuses de scene.json (ausente → por defecto; [] → sin aviso 2)`, () => {
    const { jiraReviewStatuses, ...withoutKey } = SCENE;
    const def = embedded(run({ stateDir: stateWith({ scene: withoutKey }) }, tpl).html);
    const r = def.noPr.find((x) => x.key === "ICM-1480");
    assert.equal(r.warning.code, 2); assert.match(r.warning.text, /En Revisión/);
    const empty = embedded(run({ stateDir: stateWith({ scene: { ...SCENE, jiraReviewStatuses: [] } }) }, tpl).html);
    assert.equal(empty.noPr.find((x) => x.key === "ICM-1480").warning, null);
  });

  test(`${label}: PR de Bitbucket con nulos no produce "null" ni "undefined" visibles`, () => {
    const { html } = run({ stateDir: stateWith({ scene: SCENE }) }, tpl);
    const snap = embedded(html);
    const r = rows(snap).find((x) => x.pr.number === 853);
    assert.deepEqual(r.pr.review, ["2 aprob."]);
    const visible = html.replace(/<script type="application\/json" id="snapshot">[\s\S]*?<\/script>/, "");
    assert.equal(/undefined|>\s*null\s*</.test(visible), false);
  });
}

test("CLI: escribe snapshot e index.html y resume por la salida estándar", () => {
  const dir = stateWith({ scene: SCENE });
  const script = path.join(here, "..", "..", "skills", "midgard", "scripts", "build.mjs");
  const out = JSON.parse(execFileSync("node", [script, "--state-dir", dir, "--now", "2026-11-17T08:00:00Z", "--template", MIN_TEMPLATE], { encoding: "utf8" }));
  assert.equal(out.indexHtml, path.join(dir, "index.html"));
  assert.equal(out.sources.jira, "ok");
  assert.ok(out.kpis.inProgress > 0);
});

test("CLI: argumentos no válidos fallan con código distinto de 0", () => {
  const script = path.join(here, "..", "..", "skills", "midgard", "scripts", "build.mjs");
  assert.throws(() => execFileSync("node", [script], { stdio: "pipe" }));
});
