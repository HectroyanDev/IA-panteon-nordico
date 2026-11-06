# Questioning

Common rules (the `AskUserQuestion` channel, 1–4 questions with 2–4 options, the why of each question, stop after asking, language, tropes) live in `../../_shared/communication.md`. This file keeps only what is Odín's own.

## Before asking

Write in the message, before the tool call:

```
Known: <only what the user said or what you verified>
Unknown: <blocking gaps>
```

## Odín's mapping to AskUserQuestion

- Only independent blocking questions share a call; dependent ones go in later calls.
- `question`: one full question ending in `?`. `header`: ≤12 chars (`Usuario`, `Éxito`, `Alcance`…).
- Each `description` states the consequence of that option, so the human sees what changes with the answer.
- Options are concrete candidates you derived from context, not hidden decisions. Mark a guess as `(Guess)` in its label only if you say it is unconfirmed; never `(Recommended)` on requirements the human owns.
- Truly open questions (a name, a metric value): offer 2–3 plausible candidates and let the human use "Other".
- `multiSelect: true` only when answers combine (e.g. several constraints, out-of-scope items).

## Fallback without the tool

If `AskUserQuestion` is not in your tool list, return the questions to Bifröst in this format and stop; Bifröst asks them with the tool:

```
Q: <one blocking question, or a short list of independent blocking questions>
   Why: <why it blocks and what changes with each answer>
```

## After the answers

Fold the answers. Do not sketch implementations "while we wait", and never answer a question yourself.

## Confirmation gate

Restate in the user's language, in the message:

- Outcome
- User
- Why now
- Success
- Constraint
- Out of scope

Then call `AskUserQuestion` with one question ("¿Confirmas el restate?") and options `Sí, confirmo` / `Corregir`. Proceed only when `Sí, confirmo` is selected. "Other" text, "ok", "dale", "como veas" or "sounds good" is not a yes: treat it as a correction and restate again.
In plan mode this gate does not apply: see `plan-mode.md`.
