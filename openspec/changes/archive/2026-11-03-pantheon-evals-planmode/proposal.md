# Proposal

## Why

Bifröst y las skills del panteón se cambian a menudo y hoy nada comprueba que siguen comportándose como deben: que Odín pregunte en vez de presuponer, que Bifröst no encadene fases o que un especialista en subagente devuelva sus preguntas en vez de inventar. Una suite de evals que se lance a mano da esa red de seguridad. Además, todo cambio no mecánico pasa hoy por OpenSpec (proposal, specs, design, tasks), un coste desproporcionado para ajustes, refactors y arreglos que no añaden comportamiento; plan mode de Claude Code ya ofrece plan escrito y aprobación explícita, que es lo que esos cambios necesitan.

## What Changes

- Nueva suite `evals/` para `claude plugin eval` con casos para Odín (pregunta con `AskUserQuestion` y no propone implementar), Bifröst invocado con `/bifrost` (clasifica, no encadena fases y manda un cambio pequeño a plan mode), Skuld y Brokkr en subagente (devuelven la pregunta en vez de inventar), Munin-mimir (no inventa con un Mimir vacío) y Hugin-graphify (pide permiso si no hay grafo). Graders deterministas (`regex`, `tool_used`, `tool_order`, `file_exists`) siempre que se pueda; juez `llm` (haiku) solo donde no.
- Mocks de MCP en `evals/mocks/<server>/<tool>.md` para el Mimir vacío.
- Nuevo `tests/evals.sh`, lanzado a mano: siempre `--no-publish` y `--max-cost-usd 2`, `--runs 1` por defecto y ampliable por flag. No lo llama `install.sh`. Los resultados (`evals/results/`) quedan fuera del control de versiones.
- Nuevo camino plan mode para cambios que no añaden ni modifican comportamiento que merezca spec: Bifröst entra en plan mode (`EnterPlanMode`, con permiso del humano), Odín pregunta lo que falte y escribe el plan (requisitos, enfoque, pasos, verificación), la aprobación con `ExitPlanMode` es el sí del humano, Brokkr implementa desde el archivo del plan y Heimdall valida contra el plan. Sin artefactos OpenSpec ni Hela.
- `bifrost/CLAUDE.md`: regla de elección entre plan mode y OpenSpec, fila nueva en la tabla de decisión, sección del camino plan mode y encargo con ruta y contenido del plan.
- Odín, Brokkr y Heimdall (SKILL.md y `references/role.md`) aprenden su papel en el camino plan mode; el camino OpenSpec no cambia.
- README con las evals, `tests/evals.sh` y el camino plan mode. `plugin.json` sube a `1.3.0`.

## Capabilities

### New Capabilities
- `pantheon-evals`: suite de evals del comportamiento del panteón (casos, graders, mocks) y el script que la ejecuta sin publicar y con tope de coste.
- `plan-mode-path`: camino de trabajo sin OpenSpec para cambios sin comportamiento que especificar: cuándo se elige, plan en plan mode, aprobación con `ExitPlanMode`, implementación y validación contra el plan.

### Modified Capabilities
- `specialist-execution`: el encargo completo al delegar incluye la ruta y el contenido del plan cuando el trabajo viene del camino plan mode.

## Impact

- Nuevos: `evals/<caso>/{prompt.md|case.yaml, graders/*.md}` (8 casos), `evals/mocks/mimisbrunnr/*.md`, `tests/evals.sh`, `tests/evals_test.sh` y su `claude` falso, `skills/odin/references/plan-mode.md`, `.gitignore` con `evals/results/`.
- Modificados: `bifrost/CLAUDE.md`, `skills/odin/SKILL.md`, `skills/odin/references/role.md`, `skills/brokkr/SKILL.md`, `skills/brokkr/references/role.md`, `skills/heimdall/SKILL.md`, `skills/heimdall/references/role.md`, `README.md`, `.claude-plugin/plugin.json`.
- Sin cambios: `install.sh`, `tests/install_test.sh`, skills de Skuld, Hela, Hugin, Hugin-graphify, Munin, Bragi y Forseti, y el camino OpenSpec.
- Coste: cada ejecución de `tests/evals.sh` consume crédito de la cuenta del humano (tope 2 USD por ejecución).
- Fuera de alcance: CI, hooks de Munin, `/code-review`, `/security-review`, `git init`, cambiar el camino OpenSpec.
