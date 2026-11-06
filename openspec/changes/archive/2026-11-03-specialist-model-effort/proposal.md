# Proposal

## Why

Hoy solo los especialistas en subagente fijan `model`, y ninguna skill fija `effort`: todas razonan con el esfuerzo de la sesión, sea cual sea la responsabilidad. Planificar, validar o elicitar requisitos merecen más esfuerzo que buscar en la memoria o consultar un grafo, y las skills del hilo principal (Odín, Forseti, Hela y `/bifrost`) corren con el modelo que tenga la sesión aunque su trabajo pida otro. Claude Code admite `model` y `effort` en el frontmatter de una skill, así que cada especialista puede declarar los suyos.

## What Changes

- Las 12 skills de `skills/*/SKILL.md` declaran `effort` en su frontmatter: `high` para odin, bifrost, skuld y heimdall; `medium` para hela, forseti, brokkr, hugin y bragi; `low` para hugin-graphify, munin-mimir y munin-memory.
- Las 4 skills del hilo principal declaran también `model`: odin y bifrost `opus`; hela y forseti `sonnet`. Los modelos de los forks no cambian.
- En el hilo principal, el `model` de la skill rige el resto del turno y la sesión recupera su modelo con el siguiente mensaje del humano. Es un comportamiento aceptado: los valores se eligieron para que Bifröst nunca quede por debajo de `sonnet` en ese arrastre.
- Bifröst global (`~/.claude/CLAUDE.md`) no tiene frontmatter y sigue con el modelo y el esfuerzo de la sesión; se documenta.
- `bifrost/CLAUDE.md`: la columna "Corre en" de la tabla del panteón añade el esfuerzo de cada especialista y el modelo de los del hilo principal; la sección "Especialistas en subagente" deja de decir que Odín, Forseti y Hela usan el modelo de la sesión y explica el arrastre.
- README: tabla del panteón con modelo y esfuerzo, "Cambiar el modelo de un especialista" pasa a cubrir también `effort` y se sustituye la frase de que Odín, Forseti y Hela no tienen `model` a propósito; "Cambios en 1.4.0". `plugin.json` sube a `1.4.0`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `specialist-execution`: los especialistas en subagente fijan también esfuerzo; los del hilo principal (y la skill `/bifrost`) pasan a fijar modelo y esfuerzo, con el arrastre al resto del turno; Bifröst global sigue con el de la sesión.

## Impact

- Modificados: los 12 `skills/*/SKILL.md` (solo frontmatter), `bifrost/CLAUDE.md`, `README.md`, `.claude-plugin/plugin.json`.
- Sin cambios: `install.sh`, hooks, `tests/*`, el resto de `evals/*`, `references/role.md` de cada skill, el cuerpo de las skills y `bifrost-activation` (la skill `/bifrost` sigue aplicando `bifrost/CLAUDE.md` como única fuente; su modelo y esfuerzo se especifican en `specialist-execution`).
- Evals modificados (tarea 4.2, ver design.md, "Resultado de 4.2"): los graders `evals/brokkr-no-change/graders/pide-lo-que-falta.md` y `evals/munin-mimir-empty/graders/dice-que-no-hay.md`, ampliados porque daban falsos negativos.
- Coste: Odín y `/bifrost` pasan a `opus` en su turno aunque la sesión use otro modelo; una pasada de `tests/evals.sh` para comprobar que nada empeora (≈1,6 USD, tope 2 USD).
- Fuera de alcance: cambiar los modelos de los forks, pasar especialistas a fork o sacarlos de él, el instalador y los hooks.
