import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { collect, normalize, assertReadOnly } from "../../skills/midgard/scripts/collect-github.mjs";
import { validateEnvelope } from "../../skills/_shared/scenes/scene.mjs";
import { validatePrsData } from "../../skills/midgard/scripts/schema.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FAKE_BIN = path.join(here, "..", "fixtures", "midgard-gh-bin");
const SCRIPT = path.join(here, "..", "..", "skills", "midgard", "scripts", "collect-github.mjs");

function withFakeGh(extraEnv = {}) {
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gh-log-")), "calls.log");
  const env = { ...process.env, PATH: `${FAKE_BIN}${path.delimiter}${process.env.PATH}`, MIDGARD_GH_LOG: log, ...extraEnv };
  const run = (cmd, args, opts) => spawnSync(cmd, args, { ...opts, env });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  return { run, calls, env };
}
const NOW = new Date("2026-11-17T08:00:00Z");

test("normaliza PRs: estados, aprobaciones, pendientes, hilos y última actividad", () => {
  const { run } = withFakeGh();
  const env = collect({ since: "2026-08-19", now: NOW, run });
  assert.equal(env.ok, true);
  assert.deepEqual(validateEnvelope(env, { source: "github", validateData: validatePrsData }), { valid: true });
  const by = Object.fromEntries(env.data.prs.map((p) => [p.number, p]));
  assert.equal(Object.keys(by).length, 3);
  const a = by[2318];
  assert.deepEqual([a.host, a.repo, a.state, a.draft, a.branch], ["github", "feverup/payments-api", "open", false, "feature/ICM-1412-backoff"]);
  assert.equal(a.approvals, 1); assert.equal(a.required, 2); assert.equal(a.unresolved, 3); assert.equal(a.changesRequested, 0);
  assert.deepEqual(a.pending, ["lmartin", "payments-team"]);
  assert.equal(a.approvedByPlatform, false, "1 de 2 aprobaciones con REVIEW_REQUIRED no es aprobada");
  assert.equal(a.lastActivity, "2026-11-16T09:30:00.000Z");
  const b = by[5120];
  assert.deepEqual([b.draft, b.changesRequested, b.approvals, b.approvedByPlatform, b.unresolved], [true, 1, 0, false, 0]);
  const c = by[2341];
  assert.deepEqual([c.state, c.required, c.unresolved], ["merged", null, null]);
  assert.equal(c.lastActivity, "2026-11-13T10:00:00.000Z");
});

test("approvedByPlatform sigue reviewDecision y, sin él, basta una aprobación", () => {
  const base = { number: 1, url: "https://github.com/o/r/pull/1", state: "OPEN", latestReviews: [] };
  const ap = (extra) => normalize({ ...base, ...extra }, "o/r", { required: null, unresolved: null }).approvedByPlatform;
  const one = [{ state: "APPROVED" }];
  assert.equal(ap({ reviewDecision: "APPROVED", latestReviews: one }), true);
  assert.equal(ap({ reviewDecision: "APPROVED", latestReviews: [] }), true);
  assert.equal(ap({ reviewDecision: "REVIEW_REQUIRED", latestReviews: one }), false);
  assert.equal(ap({ reviewDecision: "CHANGES_REQUESTED", latestReviews: one }), false);
  assert.equal(ap({ reviewDecision: "", latestReviews: one }), true);
  assert.equal(ap({ latestReviews: one }), true);
  assert.equal(ap({ latestReviews: [] }), false);
  assert.equal(ap({ reviewDecision: null, latestReviews: [{ state: "COMMENTED" }] }), false);
});

test("PR mergeada antigua con comentario reciente queda fuera de la ventana de 90 días", () => {
  const { run } = withFakeGh();
  const env = collect({ since: "2026-08-19", now: NOW, run });
  assert.equal(env.ok, true);
  assert.equal(env.data.prs.some((p) => p.number === 1999), false);
  assert.deepEqual(env.data.prs.map((p) => p.number).sort(), [2318, 2341, 5120]);
});

test("required: null cuando las reglas dan 403 y la protección da 404", () => {
  const { run } = withFakeGh();
  const env = collect({ since: "2026-08-19", now: NOW, run });
  assert.equal(env.data.prs.find((p) => p.number === 5120).required, null);
});

test("sin sesión → ok:false con 'gh sin sesión' y sin más llamadas", () => {
  const { run, calls } = withFakeGh({ MIDGARD_GH_AUTH: "0" });
  const env = collect({ since: "2026-08-19", now: NOW, run });
  assert.deepEqual([env.ok, env.error], [false, "gh sin sesión"]);
  assert.deepEqual(validateEnvelope(env, { source: "github" }), { valid: true });
  assert.equal(calls().length, 1);
});

test("un pr view que falla deja la fuente caída en vez de PRs a medias", () => {
  const { run } = withFakeGh({ MIDGARD_GH_DATA: "data-missing-view.json" });
  fs.writeFileSync(path.join(FAKE_BIN, "data-missing-view.json"), JSON.stringify({
    ...JSON.parse(fs.readFileSync(path.join(FAKE_BIN, "data.json"), "utf8")), prView: {},
  }));
  try {
    const env = collect({ since: "2026-08-19", now: NOW, run });
    assert.equal(env.ok, false);
    assert.match(env.error, /gh pr view falló/);
  } finally { fs.rmSync(path.join(FAKE_BIN, "data-missing-view.json"), { force: true }); }
});

test("ninguna invocación registrada es de escritura", () => {
  const { run, calls } = withFakeGh();
  collect({ since: "2026-08-19", now: NOW, run });
  const all = calls();
  assert.ok(all.length >= 8, "debe haber llamado a gh varias veces");
  for (const args of all) {
    const flat = args.join(" ");
    assert.equal(/(^|\s)(-X|--method)(\s|=|$)/.test(flat), false, flat);
    assert.equal(/\bpr (merge|close|edit|review|comment|ready|reopen|create)\b/.test(flat), false, flat);
    assert.equal(/\bissue\b/.test(flat), false, flat);
    assert.equal(/(^|\s)(-F|--field|--input)(\s|=|$)/.test(flat), false, flat);
    if (/(^|\s)-f(\s|$)/.test(flat)) assert.ok(args[0] === "api" && args[1] === "graphql" && /^query=query \{/.test(args[args.indexOf("-f") + 1]), flat);
    assert.ok(["auth", "search", "pr", "api"].includes(args[0]), flat);
  }
});

test("assertReadOnly rechaza escrituras antes de ejecutar", () => {
  for (const bad of [["pr", "merge", "1"], ["pr", "comment", "1"], ["issue", "list"], ["api", "-X", "POST", "repos/o/r/issues"],
    ["api", "--method", "DELETE", "x"], ["api", "repos/o/r", "-F", "a=b"], ["api", "repos/o/r", "-f", "a=b"],
    ["api", "graphql", "-f", "query=mutation { x }"], ["repo", "delete", "o/r"], ["auth", "logout"]]) {
    assert.throws(() => assertReadOnly(bad), bad.join(" "));
  }
  for (const good of [["auth", "status"], ["search", "prs", "--author=@me"], ["pr", "view", "u"], ["api", "repos/o/r/rules/branches/main"], ["api", "graphql", "-f", "query=query { a }"]]) {
    assert.doesNotThrow(() => assertReadOnly(good));
  }
});

test("CLI: escribe el sobre en --out", () => {
  const { env } = withFakeGh();
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gh-out-")), "sources", "github.json");
  const res = JSON.parse(execFileSync("node", [SCRIPT, "--out", out, "--since", "2026-08-19"], { encoding: "utf8", env }));
  assert.equal(res.ok, true); assert.equal(res.prs, 3);
  assert.equal(JSON.parse(fs.readFileSync(out, "utf8")).source, "github");
  assert.throws(() => execFileSync("node", [SCRIPT, "--out", out], { stdio: "pipe", env }));
});

test("CLI sin sesión escribe el sobre caído y termina bien", () => {
  const { env } = withFakeGh({ MIDGARD_GH_AUTH: "0" });
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gh-out-")), "github.json");
  const res = JSON.parse(execFileSync("node", [SCRIPT, "--out", out, "--since", "2026-08-19"], { encoding: "utf8", env }));
  assert.deepEqual([res.ok, res.error], [false, "gh sin sesión"]);
  assert.equal(JSON.parse(fs.readFileSync(out, "utf8")).error, "gh sin sesión");
});

test("el validador rechaza branch vacío en Bitbucket pero no en GitHub", () => {
  const pr = { host: "bitbucket", repo: "ws/r", number: 1, url: "https://bitbucket.org/ws/r/pull-requests/1", title: "t", branch: "", state: "open", draft: false,
    approvals: 0, required: null, approvedByPlatform: false, changesRequested: 0, unresolved: null, pending: [], lastActivity: "2026-11-16T09:30:00Z" };
  assert.match(validatePrsData({ prs: [pr] }), /branch vacío en Bitbucket/);
  assert.equal(validatePrsData({ prs: [{ ...pr, branch: "feature/ICM-1" }] }), null);
  assert.equal(validatePrsData({ prs: [{ ...pr, host: "github", url: "https://github.com/o/r/pull/1", branch: "" }] }), null);
  assert.deepEqual(validateEnvelope({ source: "bitbucket", ok: true, fetchedAt: "2026-11-17T08:00:00Z", data: { prs: [pr] } }, { source: "bitbucket", validateData: validatePrsData }).valid, false);
});
