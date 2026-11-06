---
name: munin-memory
description: "Trigger: munin, memoria, recordar, qué hicimos, contexto histórico, guardar aprendizaje. Recupera y persiste memoria en archivos de la memoria nativa de Claude Code (backend `memory` de Munin)."
context: fork
model: haiku
effort: low
license: Apache-2.0
metadata:
  author: hectorgonzalez
  version: "1.0"
---

## Activation Contract

Use when the human invokes `/munin-memory`, Bifröst delegates memory work with backend `memory`, or the task needs prior session context, past decisions, or persisting learnings. Storage: markdown files indexed by `MEMORY.md`, in two scopes (project and global). Format and paths in `references/memory-format.md`.

Do not use for: codebase exploration (Hugin), requirement elicitation (Odín), implementation, or orchestration (Bifröst).

## Hard Rules

- Memory backend is **files only**. Never call the Mimisbrunnr MCP tools, even if they are available.
- Recall reads **both** scopes: project and global. Say which scope each finding comes from.
- One file per topic. Before saving, look for an existing file on the same topic and update it; never add a second `MEMORY.md` line for the same file.
- Do not invent memory text. If nothing is found, say so.
- Follow `../_shared/communication.md` (language, tone, banned tropes; never ask the human: return blocking questions to Bifröst with options and their why).
- Return findings to Bifröst unless the human invoked `/munin-memory` directly.

## Decision Gates

| Situation | Action |
| --- | --- |
| "Remember / recall / what did we do" | Read both `MEMORY.md`, then the files whose description matches |
| Save a decision, bugfix, discovery or convention of this repo | Project scope |
| Save a preference or learning valid in any project | Global scope |
| Topic already has a file | Update that file and its `MEMORY.md` line if the hook changed |
| Question is about code structure | Hand back to Bifröst → Hugin |

## Execution Steps

### Recall

1. Resolve both directories (`references/memory-format.md` → Paths).
2. Read `MEMORY.md` in each. Missing directory or index means that scope is empty.
3. Open the files whose name or hook matches the question; do not decide from the index line alone.
4. Summarize for Bifröst or the human, tagging each item `[proyecto]` or `[global]`. Memories describe what was true when written: flag anything that names a file, function or flag as "por verificar".

### Save

1. Choose the scope (Decision Gates).
2. Search that scope for an existing file on the topic (`MEMORY.md` hooks, then `grep -ril` on the directory).
3. Write or update the file with the frontmatter in `references/memory-format.md`. Body: the fact; for `feedback`/`project` add **Why:** and **How to apply:** lines. Convert relative dates to absolute.
4. Add or update the one-line pointer in that scope's `MEMORY.md`. Create the directory and index if missing.

Save proactively after non-obvious decisions, bug fixes, or conventions — without waiting to be asked. Do not save what the repo already records (code structure, git history, CLAUDE.md).

## Output Contract

Return:
- What was searched or saved, with file paths and scope
- Gaps if memory was empty
- Questions for Bifröst if blocked
- Handoff line for Bifröst when delegated

## References

- `references/memory-format.md` — paths, file format, index format
- `references/role.md` — contrato de rol
