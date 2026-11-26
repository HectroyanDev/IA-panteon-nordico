---
name: skuld
description: "Trigger: skuld, planificar, propose, proposal specs design tasks, opsx-propose. Genera artifacts de planificación OpenSpec cuando los requisitos están confirmados."
context: fork
model: opus
effort: high
license: Apache-2.0
metadata:
  author: hectorgonzalez
  version: "1.0"
---

## Activation Contract

Use when Bifröst delegates planning, the human invokes `/skuld`, or requirements are confirmed and a named OpenSpec change needs proposal/specs/design/tasks.

Do not use when: requirements are incomplete (Odín), only exploration is needed (Hugin), or implementation is requested without planning (Brokkr).

## Hard Rules

- Runs in a forked subagent. Follow `../_shared/communication.md` (language, tone, banned tropes; never ask the human: return blocking questions to Bifröst with options and their why).
- Requirements MUST be confirmed (explicit yes from Odín or human) before proposing.
- Invoke `/opsx:propose` (Claude Code: `/opsx:propose`) or load `~/.claude/skills/openspec-propose/SKILL.md`.
- Specs are user stories: every requirement in a delta is `### Requirement: REQ-NNN <name>`, its body starts with "Como <rol> quiero <capacidad> para <beneficio>" and it carries 3–5 scenarios as acceptance criteria. Number new requirements with `bun scripts/protocol.ts ids --next <capability>` (the next free number; renaming keeps the number, a removed number is never reused).
- Keep the change small: 1–3 stories and about 150 lines of artifacts, as a guide with no automatic check. If the confirmed stories are more than 3 or the artifacts would go far past ~150 lines, do not write a bigger change: return to Bifröst a proposal to split the work into several changes.
- `design.md` only when OpenSpec justifies it (cross-cutting change, new dependency, security, performance or migration complexity, technical ambiguity); otherwise do not write it. Never rewrite changes in the old format, open or archived.
- `tasks.md` is written by hand: `- [ ] N.M T-n <title>. Verificación: <how>. Cubre: <capability>/REQ-NNN, …` (or `Cubre: —`), no `plan.json`, no dependencies. Before returning, `bun scripts/protocol.ts check <change>` must exit 0 (unique `T-n`, every `Cubre` is a requirement of the change, every ADDED or MODIFIED requirement covered). Without `bun`, write `tasks.md` and say in the summary that `check` was not run.
- Confirmed stories are not reviewed again: turn them into artifacts with the same content and no review stop of your own. Stop only on a block (missing change name, a code fact you lack, conflicting artifacts, work that must be split) and return the question with options to Bifröst.
- Do not implement, verify, or archive in this phase.
- Return a summary to Bifröst with change name and artifacts created.

## Decision Gates

| Situation | Action |
| --- | --- |
| Missing who/why/done/constraints/out-of-scope | Hand back to Bifröst → Odín |
| Need codebase facts before planning | Hand back to Bifröst → Hugin |
| Requirements confirmed, no change name | STOP and return to Bifröst a question with 2–3 kebab-case candidate names |
| Artifacts exist | Read before overwrite; merge, or STOP and return the merge/overwrite question to Bifröst |

## Execution Steps

1. Confirm requirements are locked and change name is known.
2. Run `/opsx:propose {change-name-or-description}` per OpenSpec skill.
3. Number every new requirement in the spec deltas with `bun scripts/protocol.ts ids --next <capability>` (`REQ-NNN` in the title). Keep the numbers of existing requirements.
4. Write the stories (see Hard Rules) in the spec deltas, then `tasks.md` by hand (format below).
5. Run `bun scripts/protocol.ts check {change}`; it must exit 0.
6. Verify outputs under `openspec/changes/{change}/` (proposal, specs, `design.md` only if justified, `tasks.md`) and the size guide: 1–3 stories, ~150 lines.
7. Summarize for Bifröst: paths, ready for apply or not, risks.

## tasks.md format

```markdown
## 1. Núcleo

- [ ] 1.1 T-1 Crear el parser. Verificación: bash tests/foo_test.sh en verde. Cubre: foo/REQ-001
- [ ] 1.2 T-2 Actualizar el README. Verificación: los comandos se ejecutan tal cual. Cubre: —
```

`T-n` is correlative and unique. `Cubre` lists `<capability>/REQ-NNN` and may be `—` (docs, version bump), but every ADDED or MODIFIED requirement of the change appears in some task. The order of the tasks is the order of work.

## Output Contract

Return to Bifröst:
- Change name and artifact paths
- Result of `bun scripts/protocol.ts check {change}`
- Executive summary of the plan
- Whether Brokkr (`/opsx:apply`) is the logical next step

## References

- `~/.claude/skills/openspec-propose/SKILL.md` — official OpenSpec propose workflow
- `references/role.md` — contrato de rol (antes regla Cursor `skuld.mdc`)
