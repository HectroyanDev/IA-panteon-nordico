import { test } from "node:test";
import assert from "node:assert/strict";
import { collect, normalizePr, recreatedAuthor, normalizeName, isOwnPr, assertReadOnly, TYR_SIGNATURE, TOO_LARGE_MARKER } from "../../skills/tyr/scripts/nightly-github.mjs";

const nd = (arr) => arr.map((x) => JSON.stringify(x)).join("\n");
const view = (n, over = {}) => ({ number: n, title: `PR ${n}`, isDraft: false, headRefOid: `head${n}`, author: { login: "ana" }, createdAt: `2026-11-0${n}T10:00:00Z`, url: `https://github.com/Casfid/r/pull/${n}`, state: "OPEN", headRefName: `b${n}`, ...over });
const sig = `cuerpo\n\n🤖 ${TYR_SIGNATURE}`;

test("normalizePr: SHA de Tyr, revisión manual, aviso de tamaño y líneas sin ignorados", () => {
  const files = [{ filename: "a.js", additions: 3, deletions: 2 }, { filename: "package-lock.json", additions: 4000, deletions: 0 }];
  const reviews = [
    { user: { login: "hector" }, state: "COMMENTED", body: sig, commit_id: "old", submitted_at: "2026-11-01T00:00:00Z" },
    { user: { login: "hector" }, state: "COMMENTED", body: sig, commit_id: "new", submitted_at: "2026-11-02T00:00:00Z" },
    { user: { login: "hector" }, state: "COMMENTED", body: "", commit_id: "x", submitted_at: "2026-11-03T00:00:00Z" },
  ];
  const n = normalizePr({ view: view(1), repo: "Casfid/r", me: "hector", files, reviews, issueComments: [] });
  assert.deepEqual([n.platform, n.changedLines, n.lastTyrSha, n.reviewedManually, n.tooLargeNotified, n.headSha], ["github", 5, "new", false, false, "head1"]);
  const m = normalizePr({ view: view(1), repo: "Casfid/r", me: "hector", files, reviews: [{ user: { login: "hector" }, state: "APPROVED", body: "", commit_id: "x", submitted_at: "2026-11-03T00:00:00Z" }], issueComments: [{ user: { login: "hector" }, body: `${TOO_LARGE_MARKER}\n${sig}` }] });
  assert.deepEqual([m.reviewedManually, m.tooLargeNotified, m.lastTyrSha], [true, true, null]);
  // firma falsa de otro autor: no cuenta como revisión de Tyr, ni aviso de tamaño, ni oculta la revisión manual
  const fake = normalizePr({ view: view(1), repo: "Casfid/r", me: "hector", files, reviews: [
    { user: { login: "mallory" }, state: "COMMENTED", body: sig, commit_id: "head1", submitted_at: "2026-11-05T00:00:00Z" },
    { user: { login: "mallory" }, state: "COMMENTED", body: `${TOO_LARGE_MARKER}\n${sig}`, commit_id: "head1", submitted_at: "2026-11-05T00:00:00Z" },
  ], issueComments: [{ user: { login: "mallory" }, body: `${TOO_LARGE_MARKER}\n${sig}` }] });
  assert.deepEqual([fake.lastTyrSha, fake.tooLargeNotified, fake.reviewedManually], [null, false, false]);
  const mixed = normalizePr({ view: view(1), repo: "Casfid/r", me: "hector", files, reviews: [
    { user: { login: "mallory" }, state: "COMMENTED", body: sig, commit_id: "fake", submitted_at: "2026-11-09T00:00:00Z" },
    { user: { login: "hector" }, state: "COMMENTED", body: sig, commit_id: "real", submitted_at: "2026-11-02T00:00:00Z" },
  ], issueComments: [] });
  assert.equal(mixed.lastTyrSha, "real");
  // marcador sin firma no cuenta
  assert.equal(normalizePr({ view: view(1), repo: "Casfid/r", me: "hector", files, reviews: [], issueComments: [{ user: { login: "hector" }, body: TOO_LARGE_MARKER }] }).tooLargeNotified, false);
});

function fakeGh() {
  const calls = [];
  const routes = {
    "api user": () => "hector\n",
    "auth status": () => "ok",
    "search prs --review-requested=@me": () => JSON.stringify([{ url: view(2).url, number: 2, repository: { nameWithOwner: "Casfid/r" } }, { url: view(1).url, number: 1, repository: { nameWithOwner: "Casfid/r" } }]),
    "search prs --reviewed-by=@me": () => JSON.stringify([{ url: view(1).url, number: 1, repository: { nameWithOwner: "Casfid/r" } }, { url: view(3).url, number: 3, repository: { nameWithOwner: "Casfid/r" } }]),
  };
  const run = (cmd, args) => {
    calls.push(args);
    assert.equal(cmd, "gh");
    const key = Object.keys(routes).find((k) => args.join(" ").startsWith(k));
    if (key) return { status: 0, stdout: routes[key](), stderr: "" };
    if (args[0] === "pr") { const n = Number(/pull\/(\d)/.exec(args[2])[1]); return { status: 0, stdout: JSON.stringify(view(n, n === 3 ? { author: { login: "hector" } } : {})), stderr: "" }; }
    const m = /pulls\/(\d)\/(files|reviews)|issues\/(\d)\/comments/.exec(args[1]);
    if (m?.[2] === "files") return { status: 0, stdout: nd([{ filename: "a.js", additions: Number(m[1]) * 10, deletions: 0 }]), stderr: "" };
    if (m?.[2] === "reviews") return { status: 0, stdout: m[1] === "1" ? nd([{ user: { login: "hector" }, state: "COMMENTED", body: sig, commit_id: "oldsha", submitted_at: "2026-11-02T00:00:00Z" }]) : "", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  return { run, calls };
}

test("collect: une las dos búsquedas, descarta las propias y ordena por antigüedad, solo con lecturas", () => {
  const { run, calls } = fakeGh();
  const env = collect({ owner: "Casfid", now: new Date("2026-11-19T00:00:00Z"), run });
  assert.equal(env.ok, true);
  assert.deepEqual(env.prs.map((p) => p.number), [1, 2]);
  assert.deepEqual(env.prs.map((p) => [p.changedLines, p.lastTyrSha]), [[10, "oldsha"], [20, null]]);
  for (const a of calls) assertReadOnly(a);
  assert.ok(!calls.some((a) => a.includes("-X") || a.includes("POST")));
});

test("collect falla limpio sin owner o sin sesión", () => {
  assert.equal(collect({ owner: "" }).ok, false);
  assert.equal(collect({ owner: "Casfid", run: () => ({ status: 1, stdout: "", stderr: "x" }) }).error, "gh sin sesión");
});

test("assertReadOnly rechaza escrituras", () => {
  for (const a of [["pr", "review", "1"], ["api", "x", "-X", "POST"], ["api", "x", "-f", "a=b"], ["api", "x", "--input", "f"], ["issue", "comment"], ["api", "graphql", "-f", "query=x"], ["api", "x", "-H", "Accept: application/vnd.github.raw"], ["api", "x", "--header", "X: y"]]) assert.throws(() => assertReadOnly(a), a.join(" "));
  assert.doesNotThrow(() => assertReadOnly(["api", "repos/o/r/pulls/1/reviews", "--paginate"]));
});

const HEADER = (name) => `> **Recreated from Bitbucket** [casfidIdasfest/usuarioscashless#907](https://bitbucket.org/casfidIdasfest/usuarioscashless/pull-requests/907), opened by **${name}** on 2026-11-19 14:09 UTC, last updated 2026-11-24 08:18 UTC.\n\nTexto`;

test("recreatedAuthor: con cabecera, sin ella y con cabecera fuera de la primera línea", () => {
  assert.equal(recreatedAuthor(HEADER("Héctor Ferrán González Romero")), "Héctor Ferrán González Romero");
  assert.equal(recreatedAuthor("\n\n" + HEADER("Ana")), "Ana");
  assert.equal(recreatedAuthor("Descripción normal"), null);
  assert.equal(recreatedAuthor(`Intro\n${HEADER("Ana")}`), null);
  assert.equal(recreatedAuthor(undefined), null);
});

test("normalizeName: tildes, mayúsculas y espacios", () => {
  assert.equal(normalizeName("  Héctor  Ferrán   González Romero "), "hector ferran gonzalez romero");
  assert.equal(normalizeName(null), "");
});

test("isOwnPr: login, cabecera con el nombre, otro autor y nombre vacío", () => {
  const self = "Hector Ferran Gonzalez Romero";
  assert.equal(isOwnPr({ author: { login: "hector" }, body: "" }, "hector", ""), true);
  assert.equal(isOwnPr({ author: { login: "jorge" }, body: HEADER("Héctor Ferrán González Romero") }, "hector", self), true);
  assert.equal(isOwnPr({ author: { login: "jorge" }, body: HEADER("Iván Hernández Ojeda") }, "hector", self), false);
  assert.equal(isOwnPr({ author: { login: "jorge" }, body: HEADER("Héctor Ferrán González Romero") }, "hector", ""), false);
  assert.equal(isOwnPr({ body: "" }, "", ""), false);
  assert.equal(isOwnPr({ body: "" }, undefined, ""), false);
});

test("collect: descarta la recreada con el nombre del humano, mantiene la de otro autor y tolera git config roto", () => {
  const { run } = fakeGh();
  const bodies = { 1: HEADER("Héctor Ferrán González Romero"), 2: HEADER("Iván Hernández Ojeda") };
  const wrapped = (cmd, args, o) => {
    if (args[0] === "pr") {
      const n = Number(/pull\/(\d)/.exec(args[2])[1]);
      const r = run(cmd, args, o);
      const v = JSON.parse(r.stdout);
      return { ...r, stdout: JSON.stringify({ ...v, author: { login: "jorge" }, body: bodies[n] ?? "" }) };
    }
    return run(cmd, args, o);
  };
  const git = (name) => () => ({ status: 0, stdout: `${name}\n`, stderr: "" });
  let gitArgs;
  const env = collect({ owner: "Casfid", run: wrapped, runGit: (c, a, o) => { gitArgs = [c, ...a]; return git("Hector Ferran Gonzalez Romero")(c, a, o); } });
  assert.deepEqual(gitArgs, ["git", "config", "--global", "--get", "user.name"]);
  assert.deepEqual(env.prs.map((p) => p.number), [2, 3]);
  assert.equal(env.selfName, "Hector Ferran Gonzalez Romero");
  assert.deepEqual(env.ownRecreated, [view(1).url]);
  const broken = collect({ owner: "Casfid", run: wrapped, runGit: () => ({ status: 1, stdout: "", stderr: "x" }) });
  assert.equal(broken.selfName, "");
  assert.deepEqual(broken.prs.map((p) => p.number), [1, 2, 3]);
  assert.deepEqual(broken.ownRecreated, []);
});
