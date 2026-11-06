# Design

## Context

Ver `proposal.md` (Why). Estado observado:

- No existe `evals/` ni ningún script de evals. `tests/install_test.sh` (788 líneas) es el único test: bash con `set -uo pipefail`, `HOME` temporal, `claude` falso en `tests/fixtures/bin/` y helpers `setup`/`run`/`check`/`rc_is`. Es el estilo a seguir.
- `claude plugin eval` (Claude Code 2.1.301, `--help` local): casos en `evals/**/case.yaml` o `prompt.md` + `graders/*.md`; el target puede ser la ruta del plugin skills-dir; por defecto `--ablation with-without` cuando resuelve el plugin (dos brazos, doble coste; los graders `tool_used: Skill` pasan a ser indicador with-only); `--runs` por defecto `case.runs ?? 3`; publica el informe en claude.ai salvo `--no-publish`; `--max-cost-usd` sale con 2 si se alcanza; `--threshold` por defecto 1.0 (sale con 1 si un caso queda por debajo); `--allow-tools` admite `Bash(patrón:*)`; `--mocks record` (por defecto) toma stand-ins de `evals/mocks/` para los servidores MCP **del plugin**; los resultados van a `evals/results/<timestamp>/`. `init --bare` genera `prompt.md` con frontmatter `max_turns: 10` y `allowed_tools: [Read, Glob, Grep, Skill]`, y `graders/criteria.md` con `type: llm`, `weight: 1`.
- Sandbox de eval (docs): oculta settings, hooks, `CLAUDE.md`, MCP, otros plugins, memoria y skills del usuario; tools por defecto Read, Glob, Grep, NotebookRead, Skill, AskUserQuestion, Agent, TodoWrite y task tools; Bash/Write/Edit/WebFetch/WebSearch necesitan grant. El agente no puede leer el directorio de evals.
- El plugin no declara servidores MCP: `mimisbrunnr` es un MCP del usuario. Confirmado (D8/D9) que `evals/mocks/mimisbrunnr/` se aplica igualmente.
- Confirmado en D8: en el sandbox no existen `AskUserQuestion` ni `EnterPlanMode`/`ExitPlanMode` (los casos preguntan en texto), `/<skill>` al inicio del prompt carga la skill pero no aparece como llamada `Skill`, y la sintaxis de negación en graders.
- Plan mode: `EnterPlanMode` sin parámetros y con aprobación del humano; en plan mode solo se explora, se pregunta y se escribe el archivo de plan, cuya ruta da el mensaje de sistema de plan mode (verificado en 1.2: `~/.claude/plans/<nombre-aleatorio>.md`); `ExitPlanMode` lee el plan del archivo y lo presenta para aprobación; al aprobar, la sesión pasa a aceptar ediciones. Plan mode dentro de forks verificado en 1.2. **Sin confirmar**: que una skill lo fuerce por frontmatter.
- Odín, Forseti y Hela corren en el hilo principal; Hugin, Munin, Skuld, Brokkr, Heimdall y Bragi en fork con modelo propio y sin `AskUserQuestion` (spec `specialist-execution`). Skuld y Heimdall usan `opus`.
- El repo no es git. `install.sh` en modo `marketplace` copia el repo a la caché del plugin.

## Goals / Non-Goals

**Goals:**
- Que un cambio en `bifrost/CLAUDE.md` o en una skill se pueda comprobar con un comando, en local, por menos de 2 USD y sin publicar nada.
- Que los casos midan reglas de comportamiento (preguntar, no encadenar, no inventar), no la calidad del texto.
- Que el camino plan mode conserve las dos garantías del camino OpenSpec: sí explícito antes de implementar y validación independiente después.

**Non-Goals:**
- Medir la calidad de los artefactos de Skuld, del código de Brokkr o de los informes de Heimdall.
- Casos multi-turno con `context.history_file` (se pueden añadir después).
- Que plan mode sustituya a OpenSpec en cambios con comportamiento nuevo.

## Decisions

### D1. Ocho casos, uno por regla
| Caso | Prompt (resumen) | Graders deterministas | `llm` |
| --- | --- | --- | --- |
| `odin-incomplete` | `/odin` + "quiero un dashboard" sin quién/por qué/hecho | `regex` de `Unknown\|Desconocido` y de `?` (no hay `AskUserQuestion` en el sandbox, ver D8); `regex` negativo sobre `opsx:propose\|brokkr`; `tool_used` Write/Edit con `max: 0` | No |
| `bifrost-no-waterfall` | `/bifrost` + feature con requisitos incompletos | `tool_used: Skill` con odín; `tool_used` con `max: 0` para skuld/brokkr/heimdall/hela (con `/bifrost` Bifröst no aparece como llamada `Skill`, ver D8) | No |
| `bifrost-lookup` | `/bifrost` + "¿cómo funciona X?" | `tool_used: Skill` con `hugin`; negativo de `odin\|skuld` | No |
| `bifrost-plan-mode-route` | `/bifrost` + refactor sin comportamiento nuevo | `tool_used: EnterPlanMode` si existe en el sandbox (ver D8); negativo de `skuld\|opsx:propose` | Solo si no hay `EnterPlanMode`: "elige plan mode y explica por qué no OpenSpec" |
| `skuld-no-name` | `/skuld` + requisitos confirmados sin nombre | `regex` de 2–3 nombres kebab-case; `file_exists` negativo de `openspec/changes/*` | No |
| `brokkr-no-change` | `/brokkr` + "implementa el change" sin nombre ni plan | `regex` de pregunta a Bifröst; negativo `Write`/`Edit` | No |
| `munin-mimir-empty` | `/munin-mimir` + "¿qué decidimos sobre X?" con mocks vacíos | `regex` de "no hay (recuerdos\|nada)" | Sí: "no afirma decisiones, fechas ni nombres ausentes del prompt" (no hay regex fiable para "no inventa") |
| `hugin-graphify-no-graph` | `/hugin-graphify` + pregunta de estructura | `file_exists` negativo de `graphify-out/`; `regex` de "¿Lo construyo?\|graphify no está disponible" | No |

Los casos no fijan `runs`: el número de ejecuciones lo pone el script (D4). `max_turns` bajo (6–10) para acotar coste. Los nombres siguen `<especialista>-<regla>` para filtrar con `--case 'bifrost-*'`.
*Alternativa*: un caso por especialista con muchos graders. Descartada: un fallo no dice qué regla se rompió.

### D2. Graders: deterministas y luego `llm`
Se usa `regex`, `tool_used`, `tool_order` y `file_exists` para todo lo que sea presencia/ausencia de una herramienta, orden de carga de skills, texto obligatorio o archivos creados. Solo `munin-mimir-empty` (y `bifrost-plan-mode-route` en su variante de reserva) llevan `type: llm` con el juez por defecto; su cuerpo explica por qué no basta un grader determinista. La sintaxis exacta de negación se fija en la tarea 1.1; si un tipo no admite negación, se usa `regex` sobre la transcripción con `weight` equivalente.

### D3. Mimir simulado vacío y su reserva
`evals/mocks/mimisbrunnr/mimir_context.md`, `mimir_search.md` y `mimir_get.md` devuelven resultados vacíos. Como el plugin no declara `mimisbrunnr`, la tarea 1.1 comprueba si `--mocks record` lo expone. Si no lo hace, el caso se queda sin herramientas `mimir_*` y mide la misma regla en su variante degradada: Munin-mimir dice que no tiene memoria disponible y no inventa. El grader cambia a `regex` de "no hay\|no (tengo\|está) disponible" + el `llm` de no inventar. No se declara un MCP en `plugin.json` solo para las evals: cambiaría lo que se instala.

### D4. `tests/evals.sh`
- Flags: `--runs N` (entero ≥ 1, por defecto 1), `--case GLOB` (se pasa tal cual), `--baseline` (activa `--ablation with-without`), `-h|--help`. Cualquier otro flag, o un `--runs` no entero o menor que 1 → ayuda y salida 64 (uso incorrecto; 1 y 2 ya los usa `claude plugin eval`) sin llamar a `claude`. No hay forma de cambiar `--no-publish` ni `--max-cost-usd 2`.
- Llama a `claude plugin eval "$REPO_DIR" --no-publish --max-cost-usd 2 --runs "$RUNS" --ablation none --allow-tools <lista de D5> [--case …]` y sale con su código (0, 1, 2 o 143).
- Comprueba antes que `claude` está en el `PATH`; si no, aborta con mensaje.
- Imprime al final la ruta del informe (`evals/results/` más reciente).
*Por qué `--ablation none` por defecto*: el brazo sin plugin dobla el coste y casi todos los casos dependen de que la skill exista (sin plugin fallarían por definición). `--baseline` queda para cuando se quiera medir el aporte del plugin.
*Alternativa*: aceptar flags arbitrarios y pasarlos a `claude`. Descartada: permitiría `--publish-report` o subir el tope sin querer.

### D5. Bash acotado para Hugin-graphify
`tests/evals.sh` pasa `--allow-tools 'Bash(command -v:*)' 'Bash(test -f:*)' 'Bash(test -d:*)' 'Bash(git rev-parse:*)' 'Bash(ls:*)'` y solo el caso `hugin-graphify-no-graph` incluye `Bash` en su `allowed_tools`. Nada de `graphify extract`, `graphify update` ni escritura. Así el caso no puede construir el grafo aunque la skill fallara.
*Alternativa*: sin Bash. Descartada: la skill necesita `command -v graphify` y `test -f` para decidir.

### D6. Pruebas del script sin gastar
`tests/evals_test.sh` (mismo estilo que `install_test.sh`) ejecuta `tests/evals.sh` con un `claude` falso en `tests/fixtures/evals-bin/claude` que registra sus argumentos y sale con `FAKE_EVAL_RC`. Casos: por defecto, `--runs 3`, `--case`, `--baseline`, flag desconocido, `--max-cost-usd 10`, `--runs 0`, código 2 propagado, sin `claude`. Comprueba que `--no-publish` y `--max-cost-usd 2` aparecen en todas las llamadas.

### D7. Resultados ignorados
`.gitignore` en la raíz con `evals/results/` (el repo no es git hoy; el archivo no cuesta nada y deja la regla lista). `install_test.sh` copia solo `install.sh`, `skills`, `bifrost` y `.claude-plugin`, así que no le afecta.

### D8. Verificaciones previas a escribir casos
La tarea 1.1 ejecuta un caso mínimo (`init --bare`, `--runs 1 --no-publish --max-cost-usd 0.3`) y fija: si `/odin` al inicio del prompt invoca la skill; qué pasa al llamar a `AskUserQuestion` (el run termina o recibe respuesta vacía); si `EnterPlanMode` existe en el sandbox; sintaxis de negación en `tool_used`/`file_exists`/`regex`; si `evals/mocks/mimisbrunnr/` expone herramientas; dónde queda el cwd del agente. Si `/<skill>` no funciona, los prompts dicen "Usa la skill `nordic-pantheon:<nombre>`". Los resultados se anotan aquí antes de la tarea 2.

*Verificado (tarea 1.1, 2026-11-03, `claude` 2.1.301, copia del repo en el scratchpad, `--runs 1 --no-publish --ablation none`, ~0.09 USD por ejecución con el modelo por defecto `claude-opus-5-5`):*
- **`/odin` al inicio del prompt**: carga la skill (el agente lee `skills/odin/references/...`) pero **no** aparece como llamada `Skill` en la transcripción, así que `tool_used: Skill` no sirve para esa forma. "Usa la skill nordic-pantheon:odin." sí produce `Skill {"skill":"nordic-pantheon:odin"}` y `tool_used` con `input_match` la detecta. Las skills cargadas después con la herramienta `Skill` (p. ej. Odín desde Bifröst) sí se registran.
- **`AskUserQuestion` no existe en el sandbox**: la lista de herramientas de la sesión es `Task, Glob, Grep, Read, Skill, TaskStop, ToolSearch` (+ `mcp__*` simulados), aunque el caso lo liste en `allowed_tools`. Odín cae a su formato de texto (`Known:`/`Unknown:` y preguntas en texto, igual que desde subagente) y para. Por tanto no se puede comprobar `tool_used: AskUserQuestion`; los casos que miden "pregunta" usan `regex` sobre `last_message` (`Unknown` o `Desconocido`, y `?`).
- **`EnterPlanMode` y `ExitPlanMode` no existen en el sandbox**: `bifrost-plan-mode-route` usa la variante de reserva de D1 (`llm` sobre la respuesta/transcripción).
- **Negación**: `regex` con `match: not_contains`; `tool_used` con `min: 0` y `max: 0`; `file_exists` con `exists: false`. Las tres verificadas (docs y ejecución). `regex` usa sintaxis JavaScript y `flags: i` (sin `(?i)`); por defecto mira `last_message`.
- **Mocks de `mimisbrunnr`**: se aplican aunque el plugin no declare el servidor (`kind: standalone`, estado `connected`); aparecen `mcp__mimisbrunnr__mimir_context|get|search`, diferidas (hay que cargarlas con `ToolSearch`, que sí existe). Munin-mimir llamó a `mimir_context` y `mimir_search` (3 llamadas simuladas) y respondió que no hay ninguna decisión guardada. No hace falta la variante degradada de D3. Aviso inocuo: sin `_tools.json` el mock sirve un esquema permisivo.
- **cwd del agente**: `<dir temporal>/home/cwd`, vacío. Los archivos del plugin se leen por ruta absoluta de la copia evaluada.
- **Otros**: la primera ejecución en un directorio no confiado pide confirmación; en scripts se pasa `--trust-plugin` (ver 2.1). `--keep-temp` conserva `out/trace.jsonl`.

*Verificado (tareas 3.x, 2026-11-03): coste por caso en una ejecución (`--runs 1 --ablation none`, modelo por defecto `claude-opus-5-5` para el hilo principal; cada fork usa el suyo):* `odin-incomplete` 0.13-0.18, `bifrost-no-waterfall` 0.20, `bifrost-lookup` 0.34, `skuld-no-name` 0.31 (Skuld en `opus`; el fork se lanza dos veces), `brokkr-no-change` 0.14, `munin-mimir-empty` 0.12 (incluye 3 votos del juez haiku), `hugin-graphify-no-graph` 0.16. Suma de los siete ≈ 1.4 USD; con `bifrost-plan-mode-route` ≈ 1.6, dentro del tope de 2 sin cambiar nada. Más ejecuciones (`--runs 3`) superarían el tope: el script lo avisa con salida 2.
*Verificado (3.4):* `Bash` no es utilizable de verdad en este entorno: con patrón permitido, el sandbox del run falla (`apply-seccomp ... nested userns`) y cualquier comando fuera de la lista se rechaza (`Permission ... denied ... don't ask mode`). `graphify extract . --code-only` pedido de forma explícita en el prompt queda rechazado y no se crea `graphify-out/`. El caso `hugin-graphify-no-graph` sigue siendo válido: Hugin cae a `Glob` (no encuentra `graphify-out/graph.json`), avisa y devuelve la pregunta de construir el grafo.

*Verificado (4.5, 2026-11-03):* pasada completa de `tests/evals.sh` tras 4.1-4.4: 7 de 8 casos con 1.00 y `brokkr-no-change` con 0.67 (el regex pedía un signo `?` y Brokkr devolvió opciones sin él); se cambió a `pide-lo-que-falta` + `menciona-change-o-plan` y `tests/evals.sh --case 'brokkr-*'` pasa con 1.00. Coste de la pasada completa 1.61 USD, sin URL de claude.ai en la salida. Gasto total del apply (sondas, ajustes y pasadas) ≈ 4.10 USD.
*Desviación en D4:* el script añade `--trust-plugin` (el plugin es el propio repo) para que no pida confirmación y funcione también sin terminal.

### D9. Camino plan mode en Bifröst
`bifrost/CLAUDE.md` gana:
- En **Procedimiento** paso 1: tras descartar lo mecánico, decidir el camino con la regla "¿añade o modifica comportamiento que merezca spec?": sí → OpenSpec; no (ajuste, refactor, arreglo) → plan mode; duda → `AskUserQuestion`.
- Fila nueva en la tabla de decisión: "Cambio pequeño sin comportamiento nuevo (ajuste, refactor, arreglo)" → plan mode (Odín escribe el plan; `ExitPlanMode`; Brokkr; Heimdall) / omitir Skuld, Hela y artefactos OpenSpec.
- Sección **Camino plan mode** con el flujo: `EnterPlanMode` → cargar Odín → Odín pregunta y escribe el plan → `ExitPlanMode` → con aprobación, Brokkr con encargo (ruta + contenido del plan + decisiones) → Heimdall con el mismo encargo y el resumen de Brokkr → entregar. Anti-waterfall se mantiene: Heimdall solo si el plan tiene Verificación o el humano lo pide (en la práctica casi siempre; Bifröst lo ofrece).
- Nota: si la app propone repartir los pasos en sesiones paralelas tras aprobar, Bifröst sigue delegando en Brokkr en esta sesión salvo que el humano elija otra cosa.
- **Especialistas en subagente**: "Encargo completo" menciona ruta y contenido del plan.

*Verificado (tarea 1.2, 2026-11-03, app de escritorio):*
- `EnterPlanMode` pidió permiso al humano. El mensaje de sistema da la ruta del plan: `~/.claude/plans/<nombre-aleatorio>.md` (fuera del repo), p. ej. `~/.claude/plans/polished-doodling-aho.md`. Es el único archivo editable.
- Ese mensaje de sistema trae su propio flujo (fase 1 solo subagentes `Explore`, fase 2 subagentes `Plan`, al final `ExitPlanMode`). Bifröst debe decir explícitamente que en el camino plan mode manda el panteón: hechos del código → Hugin; el plan lo escribe Odín; no lanzar `Explore`/`Plan` genéricos.
- Un fork de solo lectura funciona en plan mode: `nordic-pantheon:hugin` corrió con `claude-sonnet-5-5`, vio que plan mode estaba activo y recibió su propio archivo `…/plans/<nombre>-agent-<id>.md`. Brokkr no debe lanzarse antes de la aprobación (heredaría solo lectura).
- `ExitPlanMode` devolvió "User has approved your plan", la ruta del plan y su texto. Las opciones del diálogo (permiso de ediciones) solo las ve el humano; el modelo no las recibe.
- En la misma sesión, una segunda entrada en plan mode reutiliza el mismo archivo de plan (el mensaje de sistema dice que ya existe). Odín reemplaza su contenido entero. Verificado en 6.1.
- Tras aprobar, la app indica al modelo que compruebe si dos o más pasos del plan son independientes y, si lo son, proponga una sesión paralela por paso. Bifröst escribe los pasos del plan como secuencia dependiente o, si alguno es independiente, deja que la app lo proponga y sigue con su paso.

### D10. Odín escribe el plan
En plan mode el único archivo editable es el de plan y solo el hilo principal lo escribe. Odín ya corre en el hilo principal y su trabajo es especificar, así que escribe el plan con la plantilla de `skills/odin/references/plan-mode.md`:
```
# <título>
## Requisitos   (resultado, usuario, por qué, hecho, restricciones, fuera de alcance)
## Enfoque      (qué se toca y por qué; hechos de Hugin citados)
## Pasos        (- [ ] N. paso — cómo se comprueba)
## Verificación (comandos u observaciones que Heimdall ejecutará)
```
Odín no hace la confirmación `Sí, confirmo`: la aprobación de `ExitPlanMode` la sustituye. Si necesita hechos del código, pide a Bifröst que delegue en Hugin (verificado en 1.2: los forks de solo lectura funcionan en plan mode). `SKILL.md` de Odín gana una fila en Decision Gates ("En plan mode → plan-mode.md") y su `role.md` matiza la regla "no empieces plan hasta el sí": en plan mode el plan es la forma de pedir el sí.
*Alternativa*: Bifröst escribe el plan. Descartada: rompe "Bifröst no especifica". *Alternativa*: Skuld en fork. Descartada: Skuld es OpenSpec y en fork no ve plan mode ni pregunta.

### D11. Brokkr y Heimdall desde el plan
- Brokkr: Activation Contract y Decision Gates añaden "encargo con plan aprobado (ruta + contenido)". En ese caso no resuelve change ni usa `/opsx:apply`: lee el plan del encargo (y del archivo si es legible), implementa los pasos en orden, no modifica el archivo de plan y devuelve pasos hechos/pendientes, archivos y bloqueos. Sin plan ni change → pregunta a Bifröst (comportamiento actual ampliado).
- Heimdall: igual, sin `/opsx:verify`: recorre cada paso y ejecuta lo de Verificación; informa CRITICAL/WARNING/SUGGESTION; con todo en verde recomienda cerrar (Forseti si el humano quiere commit, Munin para aprendizajes), nunca Hela.
- Ambos `role.md` reflejan las dos fuentes (change OpenSpec o plan aprobado).
*Alternativa*: Brokkr marca los pasos en el archivo de plan. Descartada: el plan es lo aprobado; tocarlo mezcla lo aprobado con el progreso y el archivo puede quedar fuera del alcance de escritura del fork.

### D12. Versión 1.3.0
Capacidades nuevas sin cambios incompatibles → `plugin.json` 1.3.0 y sección "Cambios en 1.3.0" en el README.

## Risks / Trade-offs

- [El tope de 2 USD no alcanza con Skuld y Heimdall en `opus`] → `max_turns` bajos, `--ablation none` y `--runs 1` por defecto; ningún caso invoca a Heimdall; el caso de Skuld para en la pregunta del nombre. Si aun así se alcanza (salida 2), se mide en 3.x y se recortan turnos o se separan casos con `--case`.
- [Los mocks no se aplican a un MCP que el plugin no declara] → Variante degradada de D3, verificada en 1.1.
- [`/bifrost` en el prompt no invoca la skill en el sandbox] → Prompt alternativo con "Usa la skill …" (D8).
- [`EnterPlanMode` no existe en el sandbox] → `bifrost-plan-mode-route` cae al grader `llm` (D1).
- [Evals no deterministas: un caso pasa o falla por azar] → `--runs 3` disponible; los graders miden reglas binarias, no estilo.
- [La ruta del archivo de plan cambia entre versiones de Claude Code] → Ni Bifröst ni Odín la fijan: usan la que da el mensaje de sistema de plan mode y Bifröst la copia al encargo. La tarea 1.2 la anota para el README.
- [Plan mode no funciona dentro de forks o bloquea a Hugin] → Odín sigue sin Hugin y lo anota en Enfoque como hueco; verificado en 1.2.
- [La app de escritorio ofrece repartir el plan en sesiones paralelas] → Bifröst sigue en la sesión salvo elección del humano (D9); se documenta en el README.
- [Bifröst clasifica como "pequeño" algo que sí cambia comportamiento] → Regla con ejemplos y opción de preguntar; caso de eval `bifrost-plan-mode-route` y, en la otra dirección, `bifrost-no-waterfall`.
- [El informe se publica por error] → El script no admite quitar `--no-publish` (D4) y su test lo comprueba (D6).

## Migration Plan

1. Tareas 1.x (verificaciones), luego casos, script, skills y docs.
2. `bash tests/evals_test.sh` y `bash tests/install_test.sh` en verde; `tests/evals.sh` real con casos en verde dentro del tope.
3. Sesión nueva con `/bifrost`: un cambio pequeño de prueba recorre plan → aprobación → Brokkr → Heimdall contra el plan, sin tocar `openspec/`.

Rollback: retirar `evals/`, `tests/evals*.sh` y revertir los archivos de skills y `bifrost/CLAUDE.md` (el camino OpenSpec no cambia, así que basta con quitar la regla de plan mode).

## Open Questions

- Si a futuro conviene declarar `experimental.evals` en `plugin.json` o dejar el valor por defecto `evals/` (no cambia nada hoy).
