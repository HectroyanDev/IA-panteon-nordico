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
3. Verify outputs under `openspec/changes/{change}/` (proposal, specs, design, tasks as generated).
4. Summarize for Bifröst: paths, ready for apply or not, risks.

## Output Contract

Return to Bifröst:
- Change name and artifact paths
- Executive summary of the plan
- Whether Brokkr (`/opsx:apply`) is the logical next step

## References

- `~/.claude/skills/openspec-propose/SKILL.md` — official OpenSpec propose workflow
- `references/role.md` — contrato de rol (antes regla Cursor `skuld.mdc`)
