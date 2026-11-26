import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPr, planNight, MAX_LINES, isIgnoredPath, countChangedLines, shaMatches } from "../../skills/tyr/scripts/classify.mjs";

const base = { draft: false, changedLines: 100, headSha: "bbbbbbb1234", lastTyrSha: null, reviewedManually: false, tooLargeNotified: false };
const c = (over) => classifyPr({ ...base, ...over });

test("las siete categorías", () => {
  assert.equal(c({}), "review");
  assert.equal(c({ lastTyrSha: "a" }), "rereview");
  assert.equal(c({ draft: true }), "skip-draft");
  assert.equal(c({ lastTyrSha: "bbbbbbb1234" }), "skip-reviewed");
  assert.equal(c({ reviewedManually: true }), "skip-reviewed");
  assert.equal(c({ changedLines: 0 }), "skip-ignored-only");
  assert.equal(c({ changedLines: 2000 }), "too-large");
  assert.equal(c({ changedLines: 2000, tooLargeNotified: true }), "skip-too-large-notified");
});

test("límite exacto: 1500 se revisa, 1501 es demasiado larga", () => {
  assert.equal(MAX_LINES, 1500);
  assert.equal(c({ changedLines: 1500 }), "review");
  assert.equal(c({ changedLines: 1501 }), "too-large");
});

test("precedencias: draft y revisión manual ganan al tamaño; un aviso previo no bloquea una PR ya reducida", () => {
  assert.equal(c({ draft: true, changedLines: 5000 }), "skip-draft");
  assert.equal(c({ reviewedManually: true, changedLines: 5000 }), "skip-reviewed");
  assert.equal(c({ lastTyrSha: "bbbbbbb1234", changedLines: 5000 }), "skip-reviewed");
  assert.equal(c({ tooLargeNotified: true, changedLines: 300 }), "review");
  assert.equal(c({ lastTyrSha: "a", tooLargeNotified: true, changedLines: 300 }), "rereview");
});

test("archivos ignorados no cuentan", () => {
  for (const p of ["package-lock.json", "a/b/composer.lock", "vendor/x/y.php", "web/dist/app.js", "src/app.min.js", "logo.png", "src/api.generated.ts"]) assert.equal(isIgnoredPath(p), true, p);
  for (const p of ["src/app.js", "docs/vendorless.md", "build.gradle"]) assert.equal(isIgnoredPath(p), false, p);
  assert.equal(countChangedLines([
    { filename: "src/a.js", additions: 10, deletions: 5 },
    { filename: "yarn.lock", additions: 9000, deletions: 0 },
    { filename: "dist/x.js", additions: 500, deletions: 500 },
  ]), 15);
});

test("planNight: orden por antigüedad, máximo por noche, deduplica y separa saltadas", () => {
  const mk = (n, over) => ({ ...base, url: `u${n}`, createdAt: `2026-11-0${n}T00:00:00Z`, ...over });
  const plan = planNight([
    mk(5), mk(3), mk(4, { draft: true }), mk(2, { changedLines: 9000 }), mk(1, { lastTyrSha: "a" }), mk(3),
    mk(6, { lastTyrSha: "bbbbbbb1234" }), mk(7, { changedLines: 9000, tooLargeNotified: true }),
  ], { max: 3 });
  assert.deepEqual(plan.todo.map((p) => [p.url, p.category]), [["u1", "rereview"], ["u2", "too-large"], ["u3", "review"]]);
  assert.deepEqual(plan.deferred.map((p) => p.url), ["u5"]);
  assert.deepEqual(plan.skipped.map((p) => [p.url, p.category]).sort(), [["u4", "skip-draft"], ["u6", "skip-reviewed"], ["u7", "skip-too-large-notified"]]);
});

test("shaMatches: prefijo en minúsculas, mínimo 7 caracteres en ambos", () => {
  assert.equal(shaMatches("ABCDEF1", "abcdef1234567890"), true);
  assert.equal(shaMatches("abcdef1234567890", "abcdef1"), true);
  assert.equal(shaMatches("abcdef", "abcdef1234567890"), false);
  assert.equal(shaMatches("abcdef1234567890", "abcdef"), false);
  assert.equal(shaMatches("abcdef1", "abcdef2"), false);
  assert.equal(shaMatches(null, "abcdef1"), false);
  assert.equal(shaMatches("", ""), false);
});

test("classifyPr: SHA corto de Tyr contra head completo, y SHA demasiado corto no coincide", () => {
  assert.equal(c({ headSha: "abcdef1234567890", lastTyrSha: "abcdef1" }), "skip-reviewed");
  assert.equal(c({ headSha: "abcdef1234567890", lastTyrSha: "abcdef" }), "rereview");
  assert.equal(c({ headSha: "abcdef1234567890", lastTyrSha: "abcdef2" }), "rereview");
});

test("skip-ignored-only: precedencia tras draft y revisado, antes que el tamaño; no entra en todo", () => {
  assert.equal(c({ changedLines: 0, draft: true }), "skip-draft");
  assert.equal(c({ changedLines: 0, reviewedManually: true }), "skip-reviewed");
  assert.equal(c({ changedLines: 0, lastTyrSha: "x1234567" }), "skip-ignored-only");
  const plan = planNight([{ ...base, url: "u1", createdAt: "2026-11-01", changedLines: 0 }, { ...base, url: "u2", createdAt: "2026-11-02" }]);
  assert.deepEqual(plan.todo.map((p) => p.url), ["u2"]);
  assert.deepEqual(plan.skipped.map((p) => [p.url, p.category]), [["u1", "skip-ignored-only"]]);
});
