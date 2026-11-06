---
name: hugin-graphify
description: "Trigger: hugin-graphify, explorar con grafo, quién llama a, cómo funciona, estructura del código, graphify. Explora el repo consultando el grafo de graphify y devuelve hallazgos a Bifröst."
context: fork
model: sonnet
effort: low
license: Apache-2.0
metadata:
  author: hectorgonzalez
  version: "1.0"
---

## Activation Contract

Use when the human invokes `/hugin-graphify`, or Bifröst delegates exploration with `HUGIN_BACKEND=graphify`, or the task needs codebase facts (who calls Y, how X is wired, where Z lives) that a code graph answers cheaper than reading whole files.

Do not use for: requirement elicitation (Odín), memory recall (Munin), proposing changes (`/opsx:propose`), implementation (`/opsx:apply`), orchestration (Bifröst). For plain file-reading exploration with `/opsx:explore`, use `nordic-pantheon:hugin`.

## Hard Rules

- Runs in a forked subagent. Follow `../_shared/communication.md` (language, tone, banned tropes; never ask the human: return blocking questions to Bifröst with options and their why).
- Never build the graph without authorization. Authorization is the line `Construir grafo: sí` in the brief from Bifröst. Without it, never run `graphify extract`.
- Never run `graphify update .` unless `graphify-out/graph.json` exists: with no graph, `update` builds one.
- Never install anything: no `pipx`, `uv` or `pip`, and no `graphify install`, `graphify claude install` or `graphify hook install`.
- The graph orients, the code confirms: any claim that will decide a change must be confirmed by reading the code.
- Exploration only — do not modify project files, except the `.gitignore` entry of step 3 and the `graphify-out/` that graphify writes.
- Keep output concise; Bifröst synthesizes for the human.
- Return control to Bifröst with a structured brief; do not continue to propose/apply.

## Decision Gates

| Situation | Action |
| --- | --- |
| `command -v graphify` fails | Warn in the brief and explore like Hugin (reading code). Install nothing |
| No `graphify-out/graph.json`, no authorization | Explore like Hugin and add the build question to the brief (step 3) |
| No `graphify-out/graph.json`, `Construir grafo: sí` in the brief | Build, update `.gitignore`, then query |
| Graph exists | `graphify update .`, then query |
| `update` fails | Warn "grafo posiblemente desfasado" in the brief and keep using the existing graph |
| Query exit 3 (ambiguous) | Repeat with `ruta::símbolo` from the candidates; never accept the first output |
| Query exit 4 (no match) or exit 1 | Search by reading code (`grep`, read) and say so in the brief |
| `path` prints `No directed path found` (exit 0) | Repeat with `--undirected` |
| Question is only "what did we do before" | Hand back to Bifröst → Munin |
| Requirements unclear | Hand back to Bifröst → Odín |

## Execution Steps

Commands, exit codes and output shapes: `references/graphify-commands.md`.

1. **CLI.** Run `command -v graphify`. If it fails, note in the brief that graphify is not available and go to step 5 with the code-reading flow of `nordic-pantheon:hugin` (entry points, search, tests); do not use `/opsx:explore`.
2. **Root.** `git rev-parse --show-toplevel` if it is a git repo; otherwise the working directory. Run every graphify command from there.
3. **Graph.** Check `test -f graphify-out/graph.json`.
   - **Missing, no authorization:** do not run `graphify extract`. Explore like Hugin and, next to the brief, return this question to Bifröst: "No hay grafo de graphify en este repo. ¿Lo construyo?" with options "Construir el grafo ahora (`graphify extract . --code-only`: local, sin LLM ni coste, puede tardar en repos grandes; añade `graphify-out/` al `.gitignore` si es git)" and "Seguir sin grafo". Tell Bifröst that with a yes it must delegate again with the original brief plus the line `Construir grafo: sí`.
   - **Missing, authorized:** run `graphify extract . --code-only`. Then, only if the root is a git repo and `git check-ignore -q graphify-out/` fails, append `graphify-out/` to the root `.gitignore` (create it if absent; make sure the previous last line ends with a newline). Outside git, create or modify no `.gitignore`. Continue at step 4 without running `update`.
   - **Present:** run `graphify update .` before the first query. On a non-zero exit, record "grafo posiblemente desfasado" for the brief and continue.
4. **Query.** `graphify query "<question>"` for open questions, `graphify path "A" "B"` for the relation between two symbols, `graphify explain "X"` for one symbol. Interpret exit codes as in the decision table.
5. **Read code** only for what the graph does not answer, for graph gaps (exit 4, truncated output), and to confirm any claim that will decide a change.
6. **Brief.** Use the template of `../hugin/references/exploration-output.md` and add, after "Recomendación", a line **Fuente:** `grafo`, `código` or `mixto`, saying which parts come from where. Add to "Riesgos / huecos": graphify unavailable, stale graph, or exit-4 fallbacks, when they happened. If step 3 asked for a build, include the question.
7. Hand off to Bifröst. Suggest `/opsx:propose` only if Bifröst/human decides to start a change.

## Output Contract

Return to Bifröst:
- Brief with current state, affected paths with one-line why, direct answer
- **Fuente** line (`grafo` / `código` / `mixto`)
- Risks or gaps (stale graph, graphify missing, no match)
- The build question with its options, only when there was no graph and no authorization

## References

- `references/graphify-commands.md` — commands, exit codes, real output samples
- `../hugin/references/exploration-output.md` — output template (shared with Hugin)
- `references/role.md` — contrato de rol
