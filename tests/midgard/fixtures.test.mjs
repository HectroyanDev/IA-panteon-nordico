import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnvelope } from "../../skills/_shared/scenes/scene.mjs";
import { DATA_VALIDATORS, validatePrsData } from "../../skills/midgard/scripts/schema.mjs";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "midgard");
const load = (n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), "utf8"));

for (const source of ["jira", "github", "bitbucket"]) {
  test(`el sobre de ${source} valida con validateEnvelope`, () => {
    const env = load(source);
    assert.deepEqual(validateEnvelope(env, { source, validateData: DATA_VALIDATORS[source] }), { valid: true });
  });
}

test("los fixtures cubren los casos de 3.1", () => {
  const jira = load("jira").data.issues;
  const prs = [...load("github").data.prs, ...load("bitbucket").data.prs];
  const status = (k) => jira.find((t) => t.key === k).status;
  assert.ok(prs.some((p) => p.draft), "borrador");
  assert.ok(prs.some((p) => /ICM-1451/.test(p.title) && /ICM-1452/.test(p.title)), "PR con dos claves");
  assert.ok(prs.some((p) => p.branch.includes("ICM-1234")) && jira.some((t) => t.key === "ICM-123"), "ICM-1234 frente a ICM-123");
  assert.equal(status("ICM-1460"), "Backlog");
  assert.ok(prs.some((p) => p.branch.includes("ICM-1460") && p.state === "open"), "Backlog con PR abierta");
  assert.ok(prs.some((p) => p.branch.includes("ICM-1461") && p.state === "declined") && prs.some((p) => p.branch.includes("ICM-1461") && p.state === "merged"), "cerrada sin merge y mergeada");
  assert.equal(status("ICM-1470"), "Done (Merged in Dev)");
  assert.equal(prs.filter((p) => p.branch.includes("ICM-1470")).length, 1);
  assert.equal(status("ICM-1471"), "Done (Merged in Dev)");
  assert.equal(prs.filter((p) => p.branch.includes("ICM-1471") || p.title.includes("ICM-1471")).length, 0);
  const bb = load("bitbucket").data.prs;
  assert.ok(bb.some((p) => p.state === "open" && p.approvals === 2 && p.required === null && p.unresolved === null), "Bitbucket 2 aprobaciones con nulos");
  assert.ok(bb.some((p) => p.approvals === 1 && p.pending.length === 1 && p.changesRequested === 0), "1 aprobación y 1 pendiente");
  assert.ok(bb.some((p) => p.approvals === 1 && p.changesRequested === 1), "1 aprobación y 1 cambio pedido");
  assert.ok(bb.some((p) => p.state === "open" && p.approvals === 0), "0 aprobaciones");
  assert.ok(prs.every((p) => p.approvedByPlatform === p.approvals > 0));
  assert.ok(jira.some((t) => t.title.includes("<img src=x onerror=alert(1)>") && t.title.includes("</script>")), "título peligroso");
});

test("validatePrsData rechaza una PR con campos mal formados", () => {
  const p = load("github").data.prs[0];
  assert.equal(validatePrsData({ prs: [p] }), null);
  assert.ok(validatePrsData({ prs: [{ ...p, required: "2" }] }));
  assert.ok(validatePrsData({ prs: [{ ...p, state: "closed" }] }));
  assert.ok(validatePrsData({ prs: [{ ...p, url: "javascript:alert(1)" }] }));
});
