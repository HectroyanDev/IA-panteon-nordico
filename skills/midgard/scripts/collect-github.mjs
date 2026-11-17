#!/usr/bin/env node
// Recoge las PRs propias de GitHub con `gh` (solo lectura) y escribe el sobre de la fuente `github`.
// Uso: node collect-github.mjs --out <archivo> --since <YYYY-MM-DD>
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECENT_DAYS } from "./rules.mjs";
import { writeJsonAtomic } from "../../_shared/scenes/scene.mjs";

const PR_FIELDS = "number,title,headRefName,baseRefName,isDraft,state,mergedAt,closedAt,latestReviews,reviewRequests,reviewDecision,commits,comments,reviews,url";
const SEARCH_FIELDS = "url,repository,number,updatedAt";
const SLUG = /^[A-Za-z0-9_.-]+$/;

/** Ejecuta `gh` solo con subcomandos de lectura. Cualquier otra forma lanza antes de ejecutar nada. */
export function assertReadOnly(args) {
  const [a, b] = args;
  const flat = args.join(" ");
  if (a === "auth" && b === "status") return;
  if (a === "search" && b === "prs") return;
  if (a === "pr" && b === "view") return;
  if (a === "api") {
    if (args.some((x) => /^(-X|--method|-F|--field|--input|--raw-field)/.test(x))) throw new Error(`gh api con método o campos no permitido: ${flat}`);
    if (args.includes("-f")) {
      if (b !== "graphql") throw new Error(`gh api con -f solo se admite en graphql: ${flat}`);
      const i = args.indexOf("-f");
      if (!/^query=/.test(args[i + 1] ?? "") || /\bmutation\b/i.test(args[i + 1])) throw new Error(`gh api graphql solo admite consultas: ${flat}`);
    }
    return;
  }
  throw new Error(`subcomando de gh no permitido: ${flat}`);
}

function gh(args, run = spawnSync) {
  assertReadOnly(args);
  const r = run("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, status: -1, stdout: "", stderr: String(r.error.message) };
  return { ok: r.status === 0, status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function json(res) {
  try { return JSON.parse(res.stdout); } catch { return undefined; }
}

const maxDate = (dates) => {
  const ts = dates.filter(Boolean).map((d) => Date.parse(d)).filter((t) => !Number.isNaN(t));
  return ts.length ? new Date(Math.max(...ts)).toISOString() : null;
};

export function normalize(view, repo, { required, unresolved }) {
  const reviews = view.latestReviews ?? [];
  const state = view.state === "MERGED" ? "merged" : view.state === "CLOSED" ? "declined" : "open";
  const approvals = reviews.filter((r) => r.state === "APPROVED").length;
  return {
    host: "github",
    repo,
    number: view.number,
    url: view.url,
    title: view.title ?? "",
    branch: view.headRefName ?? "",
    state,
    draft: view.isDraft === true,
    approvals,
    required,
    // reviewDecision manda; sin él (repo sin revisiones obligatorias) basta una aprobación.
    approvedByPlatform: view.reviewDecision === "APPROVED" || (!view.reviewDecision && approvals > 0),
    changesRequested: reviews.filter((r) => r.state === "CHANGES_REQUESTED").length,
    unresolved,
    pending: (view.reviewRequests ?? []).map((r) => r.login ?? r.slug ?? r.name).filter(Boolean),
    lastActivity: maxDate([
      ...(view.commits ?? []).map((c) => c.committedDate ?? c.authoredDate),
      ...(view.reviews ?? []).map((r) => r.submittedAt),
      ...(view.comments ?? []).map((c) => c.createdAt),
      view.mergedAt, view.closedAt,
    ]),
  };
}

function unresolvedThreads(owner, name, number, run) {
  if (!SLUG.test(owner) || !SLUG.test(name) || !Number.isInteger(number)) return null;
  const query = `query { repository(owner: "${owner}", name: "${name}") { pullRequest(number: ${number}) { reviewThreads(first: 100) { nodes { isResolved } } } } }`;
  const res = gh(["api", "graphql", "-f", `query=${query}`], run);
  if (!res.ok) return null;
  const nodes = json(res)?.data?.repository?.pullRequest?.reviewThreads?.nodes;
  return Array.isArray(nodes) ? nodes.filter((n) => n.isResolved === false).length : null;
}

function requiredApprovals(owner, name, base, run) {
  if (!SLUG.test(owner) || !SLUG.test(name) || typeof base !== "string" || base === "" || /[^A-Za-z0-9_./-]/.test(base)) return null;
  const rules = gh(["api", `repos/${owner}/${name}/rules/branches/${base}`], run);
  if (rules.ok) {
    const list = json(rules);
    if (Array.isArray(list)) {
      const rule = list.find((r) => r.type === "pull_request");
      const n = rule?.parameters?.required_approving_review_count;
      if (Number.isInteger(n)) return n;
    }
  }
  const prot = gh(["api", `repos/${owner}/${name}/branches/${base}/protection/required_pull_request_reviews`], run);
  if (prot.ok) {
    const n = json(prot)?.required_approving_review_count;
    if (Number.isInteger(n)) return n;
  }
  return null; // 403/404 o sin regla legible
}

/** Devuelve el sobre de la fuente `github`. `run` permite inyectar un ejecutor en pruebas. */
export function collect({ since, now = new Date(), run = spawnSync } = {}) {
  const fetchedAt = now.toISOString();
  const fail = (error) => ({ source: "github", ok: false, fetchedAt, error });
  const auth = gh(["auth", "status"], run);
  if (!auth.ok) return fail("gh sin sesión");

  const found = new Map();
  for (const args of [
    ["search", "prs", "--author=@me", "--state=open", "--limit", "100", "--json", SEARCH_FIELDS],
    ["search", "prs", "--author=@me", "--state=closed", `--updated=>=${since}`, "--limit", "100", "--json", SEARCH_FIELDS],
  ]) {
    const res = gh(args, run);
    const list = res.ok ? json(res) : undefined;
    if (!Array.isArray(list)) return fail(`gh search prs falló${res.stderr ? `: ${res.stderr.trim().split("\n")[0]}` : ""}`);
    for (const item of list) if (item?.url) found.set(item.url, item);
  }

  const cutoff = now.getTime() - RECENT_DAYS * 86400000;
  const prs = [];
  for (const item of found.values()) {
    const view = gh(["pr", "view", item.url, "--json", PR_FIELDS], run);
    const v = view.ok ? json(view) : undefined;
    if (!v || typeof v !== "object") return fail(`gh pr view falló en ${item.url}`);
    const repo = item.repository?.nameWithOwner ?? /github\.com\/([^/]+\/[^/]+)\//.exec(item.url)?.[1];
    if (!repo) return fail(`repositorio desconocido en ${item.url}`);
    const [owner, name] = repo.split("/");
    const open = v.state === "OPEN";
    // La búsqueda filtra por `updated`, que un comentario reciente mueve: las mergeadas/cerradas se filtran de nuevo por su fecha de cierre.
    if (!open) {
      const closedTs = Date.parse(v.mergedAt ?? v.closedAt ?? "");
      if (!Number.isNaN(closedTs) && closedTs < cutoff) continue;
    }
    prs.push(normalize(v, repo, {
      required: open ? requiredApprovals(owner, name, v.baseRefName, run) : null,
      unresolved: open ? unresolvedThreads(owner, name, v.number, run) : null,
    }));
  }
  prs.sort((a, b) => a.repo.localeCompare(b.repo) || a.number - b.number);
  return { source: "github", ok: true, fetchedAt, data: { prs } };
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined) throw new Error(`argumento no válido: ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.out) throw new Error("falta --out");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.since ?? "")) throw new Error("falta --since YYYY-MM-DD");
  const env = collect({ since: args.since });
  writeJsonAtomic(args.out, env);
  process.stdout.write(`${JSON.stringify({ out: args.out, ok: env.ok, error: env.error ?? null, prs: env.ok ? env.data.prs.length : 0 })}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { main(process.argv.slice(2)); } catch (err) { process.stderr.write(`${err.message}\n`); process.exit(1); }
}
