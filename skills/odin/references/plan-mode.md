# Plan mode

Odín's flow when Bifröst loads you inside Claude Code plan mode (the plan-mode path for small changes with no new behavior to spec: adjustments, refactors, fixes). The OpenSpec path does not use this file.

## When it applies

- Plan mode is active (the plan-mode system message is in force) and Bifröst delegated elicitation.
- In plan mode you are on the main thread, so you can ask with `AskUserQuestion` and you are the only one who writes the plan file.

## Where the plan goes

- The plan file is the one path plan mode says you may edit. Use the path from the plan-mode system message. Never invent or hard-code a path.
- If you cannot find that path, stop and ask Bifröst for it. Do not write anywhere else, and never touch `openspec/` or any repo file.

## Flow

1. Write `Known` vs `Unknown` as usual (`references/questioning.md`). Ask only blocking questions with `AskUserQuestion`. STOP.
2. Need facts from the code (what is touched, how it works today)? Do not explore yourself. Ask Bifröst to delegate to Hugin and wait for the brief. Cite those facts in `Enfoque`. If no brief comes, note the gap in `Enfoque` as an unknown, never as a fact.
3. Fold the answers and write the plan file with the template below. Every step says how it is checked.
4. The approval with `ExitPlanMode` replaces the `Sí, confirmo` question: do not ask it. Return to Bifröst with the plan path and a one-line summary so Bifröst presents the plan with `ExitPlanMode`. STOP.
5. If the human rejects the plan or asks for changes, you stay in plan mode: ask what is still unknown, edit the plan file, return to Bifröst again.

Do not implement, run `/opsx:*`, or write code. Writing the plan file is the only write you do.

## Plan template

```markdown
# <short title of the change>

## Requisitos
- Resultado: <what must be true afterwards>
- Usuario: <who benefits or is affected>
- Por qué ahora: <trigger>
- Hecho cuando: <observable success>
- Restricciones: <limits, conventions, compatibility>
- Fuera de alcance: <what is not touched>

## Enfoque
<what is touched and why; facts from Hugin cited with file paths; open gaps marked as unknown>

## Pasos
- [ ] 1. <step> — se comprueba con <command or observation>
- [ ] 2. <step> — se comprueba con <command or observation>

## Verificación
- <command or observation Heimdall will run after Brokkr, one per line>
```

Rules for the template:

- Keep the four section names exactly (`Requisitos`, `Enfoque`, `Pasos`, `Verificación`): Brokkr and Heimdall look for them.
- Steps are an ordered, dependent sequence unless one is really independent; write them small enough for one Brokkr pass.
- `Verificación` lists only checks that can run without the human (tests, `grep`, diffs, commands). If a check needs the human, say so there.
- No step may require a decision the plan does not make. If one does, it is an Unknown: ask before writing.
