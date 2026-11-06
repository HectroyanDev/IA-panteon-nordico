# nordic-pantheon

Plugin de Claude Code con un equipo de especialistas (el panteón) orquestados por Bifröst: requisitos, exploración, memoria, planificación OpenSpec, implementación, validación, documentación y git. Se instala con un solo script, `install.sh`.

## Camino rápido

```bash
./install.sh install --yes
```

Instala en modo `link`, con Munin sobre Mimisbrunnr y Bifröst como orquestador global. Después abre una sesión nueva de Claude Code.

## El panteón

| Especialista | Trabajo | Skill | Dónde corre / modelo / esfuerzo |
| --- | --- | --- | --- |
| Bifröst | Orquestar, decidir pasos, entregar | `nordic-pantheon:bifrost` | Global vía `~/.claude/CLAUDE.md` o bajo demanda con `/bifrost` (sesión en global; `opus`, `high` con `/bifrost`) |
| Odín | Especificar / elicitar requisitos | `nordic-pantheon:odin` | Hilo principal, `opus`, `high` |
| Hugin | Explorar código leyéndolo | `nordic-pantheon:hugin` | Subagente, `sonnet`, `medium` |
| Hugin-graphify | Explorar código consultando el grafo de graphify | `nordic-pantheon:hugin-graphify` | Subagente, `sonnet`, `low` |
| Munin (Mimir) | Memoria sobre el MCP `mimisbrunnr` | `nordic-pantheon:munin-mimir` | Subagente, `haiku`, `low` |
| Munin (memoria) | Memoria nativa de Claude Code | `nordic-pantheon:munin-memory` | Subagente, `haiku`, `low` |
| Skuld | Planificar (proposal, specs, design, tasks) | `nordic-pantheon:skuld` | Subagente, `opus`, `high` |
| Brokkr | Implementar | `nordic-pantheon:brokkr` | Subagente, `sonnet`, `medium` |
| Heimdall | Validar contra la spec | `nordic-pantheon:heimdall` | Subagente, `opus`, `high` |
| Vár | Vigilar que el trabajo no se desvíe del plan aprobado | `nordic-pantheon:var` (+ módulo `hooks/var.tsx`) | Segundo plano (mod), juicio `opus`, `high`; `/var` en subagente, `opus`, `high` |
| Bragi | Documentar | `nordic-pantheon:bragi` | Subagente, `sonnet`, `medium` |
| Forseti | Commits, ramas, PRs | `nordic-pantheon:forseti` | Hilo principal, `sonnet`, `medium` |
| Hela | Cerrar un change completado | `nordic-pantheon:hela` | Hilo principal, `sonnet`, `medium` |
| Tyr | Revisar PRs de GitHub y Bitbucket con comentarios inline | `nordic-pantheon:tyr` | Hilo principal (lentes en subagentes paralelos), `opus`, `high` |

Bifröst delega la exploración en `hugin` o `hugin-graphify` según `HUGIN_BACKEND` (ver "Cambiar el backend de Hugin").

Odín, Forseti y Hela corren en el hilo principal porque preguntan al humano o piden permiso. Los especialistas en subagente no preguntan: devuelven sus preguntas a Bifröst, que las hace y vuelve a delegar.

## Requisitos

| Dependencia | Obligatoria | Para qué |
| --- | --- | --- |
| CLI `claude` | Sí | Sin ella el instalador aborta |
| `openspec` 1.14.x | No | `/opsx:*` (Skuld, Brokkr, Heimdall, Hela). Si falta, aviso |
| `uv` o `pipx` | Solo con `--hugin=graphify` | Instalan la CLI de graphify (`graphifyy`, Python 3.10+). Sin ninguno, aviso y Hugin se queda en `plain`. Si `graphify` ya está en el `PATH`, no hacen falta |
| MCP `mimisbrunnr` | Solo con `--munin=mimir` | Memoria de Munin-mimir. Si falta en la CLI, el instalador ofrece instalarlo (opcional, ver "Instalar Mimisbrunnr"). La app de escritorio y la CLI tienen configs de MCP distintas: si solo está en la app, en sesiones de la CLI Munin-mimir no tendrá memoria |
| `git` y Go 1.26+ | Solo para instalar Mimisbrunnr | Clonar y compilar `mimisbrunnr` (no publica binarios). Si falta alguno, o falla el clon, la compilación o el registro, aviso con los pasos manuales y la instalación del plugin termina bien |

Probado en Linux.

## Instalar

```bash
./install.sh install                                              # pregunta cada opción
./install.sh install --yes                                        # valores por defecto
./install.sh install --mode=link --munin=memory --bifrost=skill   # todo por flags, sin preguntas
./install.sh install --hugin=graphify                             # Hugin sobre el grafo de graphify
./install.sh install --yes --mimir=skip                           # sin instalar el MCP Mimisbrunnr
```

| Flag | Valores | Por defecto |
| --- | --- | --- |
| `--mode` | `link`, `marketplace` | `link` |
| `--munin` | `mimir`, `memory` | `mimir` |
| `--bifrost` | `link`, `skill` | `link` |
| `--hugin` | `plain`, `graphify` | `plain` |
| `--mimir` | `install`, `skip` | `install` |
| `--yes` | Sin preguntas; lo que falte toma su valor por defecto | — |

Un valor no válido aborta sin tocar nada. `./install.sh --help` muestra la ayuda.

`--mimir` solo aplica con `--munin=mimir` y cuando `claude mcp get mimisbrunnr` falla. En modo interactivo se pregunta la última, después de Hugin. No se guarda en la config: es una acción puntual y la idempotencia la da `claude mcp get`.

Reinstalar con las mismas opciones no cambia nada. Reinstalar con otras opciones las aplica y conserva el backup de `CLAUDE.md`.

### Modos de instalación

| Modo | Qué hace | Cambios del repo |
| --- | --- | --- |
| `link` | Symlink `~/.claude/skills/nordic-pantheon` → repo. El plugin se carga como `nordic-pantheon@skills-dir` | Visibles en la siguiente sesión |
| `marketplace` | Registra el repo como marketplace local e instala `nordic-pantheon@nordic-pantheon` (copia en caché) | Requieren `./install.sh update` |

Los dos modos son excluyentes: instalar uno retira el otro para que el plugin no se cargue dos veces. Si `~/.claude/skills/nordic-pantheon` existe y no es un symlink a este repo, el instalador aborta y no lo toca.

### Instalar Mimisbrunnr

Con `--munin=mimir`, sin el MCP `mimisbrunnr` en la CLI y con `--mimir=install` (el valor por defecto con `--yes`), `install` lo instala y lo registra:

1. Clona `https://github.com/HectroyanDev/Mimisbrunnr` en `${XDG_CACHE_HOME:-~/.cache}/nordic-pantheon/mimisbrunnr` (si ya hay un clon, `git pull --ff-only`; si la ruta tiene otra cosa, avisa y no la toca).
2. Compila siempre con `go build -o ~/.local/bin/mimisbrunnr ./cmd/mimisbrunnr` y **sobrescribe** `~/.local/bin/mimisbrunnr` si ya existía: no se reutiliza un binario previo. No usa `go install` (el módulo del `go.mod` no coincide con la URL del repo).
3. Registra el binario solo en la CLI con `claude mcp add -s user mimisbrunnr`, con `MIMISBRUNNR_DRIVER=sqlite` y `MIMISBRUNNR_SQLITE_PATH=${XDG_CONFIG_HOME:-~/.config}/mimisbrunnr/mimisbrunnr.db`.

Necesita `git`, Go 1.26+ y red. Sin `XDG_CONFIG_HOME`, la base es `~/.config/mimisbrunnr/mimisbrunnr.db`, la misma que usa la app de escritorio, así que comparten memoria; con `XDG_CONFIG_HOME` distinto de `~/.config`, la CLI usa otra base. El instalador no toca `claude_desktop_config.json`. Si falta algo o algún paso falla, avisa con los pasos manuales y sigue.

Si el MCP ya está registrado en la CLI no se clona, compila ni registra nada (los reinstalls no recompilan). Con `--mimir=skip` solo avisa de que falta.

### Bifröst

| Opción | Efecto |
| --- | --- |
| `--bifrost=link` | `~/.claude/CLAUDE.md` → `bifrost/CLAUDE.md`. Bifröst orquesta todas las sesiones |
| `--bifrost=skill` | Sin symlink global. Bifröst se carga con `/bifrost` cuando haga falta |

Si ya había un `~/.claude/CLAUDE.md` propio, se mueve a `~/.claude/CLAUDE.md.bak-nordic-<fecha>` y se restaura al pasar a `skill` o al desinstalar.

### Configuración

El instalador guarda las opciones en `~/.config/nordic-pantheon/config` (o `$XDG_CONFIG_HOME/nordic-pantheon/config`):

```
INSTALL_MODE=link
BIFROST_MODE=link
MUNIN_BACKEND=mimir
HUGIN_BACKEND=plain
GRAPHIFY_INSTALLED_BY=
CLAUDE_MD_BACKUP=
REPO_DIR=/ruta/al/repo
VAR_ENABLED=on
VAR_MINUTES=10
VAR_TOOL_CALLS=40
```

`VAR_ENABLED`, `VAR_MINUTES` y `VAR_TOOL_CALLS` los usa Vár (ver "Vár: vigilancia del plan"); el instalador los crea con esos valores y los conserva al reinstalar. Se cambian editando la config.

Bifröst lee `MUNIN_BACKEND` para elegir la skill de Munin y `HUGIN_BACKEND` para elegir la de Hugin. `GRAPHIFY_INSTALLED_BY` (`uv`, `pipx` o vacío) recuerda quién instaló `graphifyy`, para que `uninstall` retire solo lo que puso el instalador.

## Actualizar

```bash
./install.sh update
```

| Modo | Qué hace |
| --- | --- |
| `link` | Comprueba el symlink y lo recrea si falta o está roto |
| `marketplace` | Refresca marketplace y plugin; si la caché no coincide con el repo, reinstala el plugin |

`update` no clona ni compila Mimisbrunnr. Para recompilarlo, retira el registro (`claude mcp remove -s user mimisbrunnr`) y ejecuta `./install.sh install`.

Sin instalación previa, pide ejecutar `install`. Tras `install` o `update`, abre una sesión nueva de Claude Code.

## Desinstalar

```bash
./install.sh uninstall           # conserva la memoria global
./install.sh uninstall --purge   # borra también ~/.claude/nordic-pantheon/
```

Retira solo lo que apunta a este repo: el symlink de skills o el plugin y su marketplace, el symlink de `CLAUDE.md` (restaurando el backup) y la config. Si el instalador instaló `graphifyy`, lo desinstala (`uv tool uninstall graphifyy` o `pipx uninstall graphifyy`); si ya lo tenías, no lo toca. Los `graphify-out/` de tus repos tampoco, ni con `--purge`. Un `~/.claude/CLAUDE.md` ajeno queda intacto.

`uninstall` (también con `--purge`) y pasar a `--munin=memory` no tocan Mimisbrunnr: ni el binario `~/.local/bin/mimisbrunnr`, ni el registro del MCP (no llaman a `claude mcp remove`), ni la base `${XDG_CONFIG_HOME:-~/.config}/mimisbrunnr/`, ni la caché del clon. Para retirarlos a mano:

```bash
claude mcp remove -s user mimisbrunnr
rm ~/.local/bin/mimisbrunnr
rm -rf "${XDG_CACHE_HOME:-$HOME/.cache}/nordic-pantheon/mimisbrunnr"
# La base de datos son tus recuerdos: bórrala solo si quieres perderlos
rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr"
```

## Cambiar el backend de Munin

```bash
./install.sh install --munin=memory   # memoria nativa de Claude Code
./install.sh install --munin=mimir    # MCP mimisbrunnr
```

Los recuerdos no se migran entre backends.

| Backend | Dónde guarda |
| --- | --- |
| `mimir` | MCP `mimisbrunnr` |
| `memory` | Proyecto: `~/.claude/projects/<proyecto>/memory/`. Global: `~/.claude/nordic-pantheon/memory/` |

## Cambiar el backend de Hugin

```bash
./install.sh install --hugin=graphify   # consulta el grafo de graphify
./install.sh install --hugin=plain      # lee el código directamente (por defecto)
```

| Backend | Skill | Cómo explora |
| --- | --- | --- |
| `plain` | `nordic-pantheon:hugin` | Lee archivos; usa `/opsx:explore` si existe |
| `graphify` | `nordic-pantheon:hugin-graphify` | Refresca el grafo con `graphify update .`, responde con `graphify query`, `path` y `explain`, y lee código solo donde el grafo no llega o para confirmar lo que decida un cambio. El brief indica la fuente (grafo, código o mixto) |

Con `--hugin=graphify`, el instalador instala solo la CLI: `uv tool install graphifyy` si hay `uv` y, si no, `pipx install graphifyy`. No ejecuta `graphify install` ni registra skills o hooks de graphify. Todo corre en local, sin LLM ni API key. Volver a `plain` no desinstala nada.

Si `graphify` no está en el `PATH` (por ejemplo, `~/.local/bin` sin configurar: `uv tool update-shell` o `pipx ensurepath`), `hugin-graphify` lo avisa y explora leyendo código.

**Primer uso en un repo.** Si no existe `graphify-out/`, `hugin-graphify` no construye el grafo por su cuenta: explora leyendo código y Bifröst te pregunta si construirlo con `graphify extract . --code-only` (local, sin coste; puede tardar en repos grandes). Con un sí lo construye y, si el repo es git y no lo ignora ya, añade `graphify-out/` al `.gitignore`. En un directorio sin git no crea ningún `.gitignore`: si ese directorio pasa a ser git, ignora `graphify-out/` a mano.

`./install.sh update` no actualiza `graphifyy`. Hazlo a mano con `uv tool upgrade graphifyy` o `pipx upgrade graphifyy`.

## Cambiar el modelo de un especialista

Edita `model:` y `effort:` en el frontmatter de su `skills/<nombre>/SKILL.md`:

```yaml
---
name: hugin
context: fork
model: sonnet
effort: medium
---
```

En modo `link` el cambio vale en la siguiente sesión; en modo `marketplace`, tras `./install.sh update`. `effort` admite `low`, `medium`, `high`, `xhigh` y `max`. Odín, Forseti y Hela corren en el hilo principal y también fijan ambos: su `model` rige hasta el final del turno y la sesión recupera el suyo con el siguiente mensaje del humano (tras Hela o Forseti, el resto del turno sigue con `sonnet`). Que el `effort` de una skill del hilo principal se arrastre más allá de la skill no está verificado: se asume que rige al menos mientras está activa. Bifröst global usa el modelo y el esfuerzo de la sesión; `/bifrost` fija `opus` y `high`.

## Camino plan mode

Para cambios que no añaden ni modifican comportamiento que merezca spec (un ajuste, un refactor, un arreglo). Bifröst lo elige con una pregunta: ¿el cambio añade o modifica comportamiento que merezca spec? Si sí, OpenSpec; si no, plan mode; si duda, te pregunta. Las tareas mecánicas siguen resolviéndose sin más.

Flujo:

1. Bifröst llama a `EnterPlanMode`; la app te pide permiso. Si lo rechazas, Bifröst para y no edita nada.
2. Odín te pregunta lo que falte (si necesita datos del código, Bifröst los pide a Hugin) y escribe el plan con las secciones Requisitos, Enfoque, Pasos (cada uno con su comprobación) y Verificación.
3. Bifröst presenta el plan con `ExitPlanMode`. Tu aprobación es el sí explícito, sustituye al `Sí, confirmo` de Odín y sin ella no se implementa. Si rechazas o pides cambios, sigues en plan mode y Odín ajusta el plan.
4. Brokkr implementa los pasos desde el plan aprobado (sin `tasks.md` ni `/opsx:apply`, y sin tocar el archivo de plan).
5. Heimdall valida contra los pasos y la Verificación del plan, con severidades CRITICAL, WARNING y SUGGESTION. Con todo en verde se ofrece Forseti o Munin, nunca Hela.

Sin artefactos OpenSpec: este camino no crea ni modifica nada bajo `openspec/` ni usa a Skuld ni a Hela.

El archivo de plan lo da el mensaje de sistema de plan mode: hoy es `~/.claude/plans/<nombre-aleatorio>.md`, fuera del repo. Ni Bifröst ni Odín fijan esa ruta; Bifröst la copia al encargo de Brokkr y Heimdall junto con el contenido del plan. En plan mode manda el panteón: los hechos del código los saca Hugin y el plan lo escribe Odín, no los subagentes genéricos `Explore` y `Plan` que propone la app.

Tras aprobar, la app puede proponer una sesión paralela por cada paso independiente del plan. Bifröst sigue delegando en Brokkr en esta sesión salvo que elijas otra cosa.

## Vár: vigilancia del plan

Vár comprueba en segundo plano que el trabajo (el hilo principal y los subagentes) no se desvíe del plan que aprobaste, y reconduce sin esperarte. Son dos piezas: el módulo `hooks/var.tsx` (la vigilancia automática) y la skill `/var` (la comprobación puntual).

**Cuándo vigila.** Se activa sola al aprobar un plan con `ExitPlanMode` (el archivo de plan) o al cargar a Brokkr o `/opsx:apply` para un change (su `tasks.md`; si no hay un único change identificable, no se activa y el panel lo anota). Termina al empezar Heimdall o `/opsx:verify`, al archivar, al marcar todas las tareas, al aprobar otro plan o al cerrar la sesión. Sin plan activo no cuenta ni juzga nada.

**Cuándo juzga.** Cuando pasan `VAR_MINUTES` minutos o se hacen `VAR_TOOL_CALLS` llamadas a herramientas (suma de todos los hilos), lo primero que ocurra; después la ventana empieza de nuevo. Una tarea corta no dispara ningún juicio. Cada juicio usa `opus`/`high` sobre el plan y las llamadas de cada hilo (sin resultados de herramientas) y da `alineado`, `menor` o `desvío` por hilo. El criterio está en `skills/var/references/judge.md`.

**Qué hace con un desvío.** Inyecta en el hilo que se desvió una corrección con plantilla fija (paso que toca y qué dejar de hacer), sin pararlo ni esperarte; un subagente ya terminado se corrige a través del hilo principal. Una corrección solo recuerda el plan: no añade pasos ni autoriza nada. Tras dos correcciones, el siguiente desvío del hilo queda como persistente: no se corrige más y te lo notifica. `menor` solo se registra.

| Clave | Valores | Por defecto | Efecto |
| --- | --- | --- | --- |
| `VAR_ENABLED` | `on`, `off` | `on` | `off` apaga la vigilancia automática (no cuenta, no juzga, no abre el panel); `/var` sigue funcionando |
| `VAR_MINUTES` | entero positivo | `10` | Minutos de una ventana |
| `VAR_TOOL_CALLS` | entero positivo | `40` | Llamadas de una ventana |

Rigen desde la siguiente activación de plan. Un valor no válido vuelve al valor por defecto y el panel lo avisa.

**`/var`.** Comprobación puntual contra el plan activo: informa del veredicto por hilo y, si hay `desvío`, corrige por la misma vía que la vigilancia automática (misma plantilla, mismo límite de correcciones, mismo registro y notificación). Funciona también con `VAR_ENABLED=off`. Sin plan, responde que no hay plan que vigilar. No ejecuta tests ni valida contra la spec (eso es Heimdall) ni edita nada.

**Panel y notificación.** Al activarse un plan con `VAR_ENABLED=on` se abre el panel lateral de Vár (plan, contadores `n/VAR_TOOL_CALLS llamadas · m/VAR_MINUTES min`, último juicio y registro con cada desvío y su corrección destacados, con su origen `auto` o `/var`). `/var-panel` lo abre a mano, también con `off`. Si la superficie no coloca paneles queda un resumen en la línea de estado. Cada `desvío` y cada desvío persistente genera una notificación del sistema (`$.ui.notify`; si la app no la envía, `notify-send` en Linux u `osascript` en macOS). El registro es solo de la sesión: no se guarda entre sesiones ni en Munin.

**Versión de Claude Code.** El módulo usa la API de mods (acceso anticipado, cambia entre versiones), escrita contra los tipos de la 2.1.309 que trae la app de escritorio. La CLI 2.1.301 no se ha comprobado. Las comprobaciones en vivo (carga del módulo en modo `link` y `marketplace`, señal de plan rechazado, inyección en subagentes `fork`, notificación en la app) están pendientes: ver las tareas 1.1 a 1.5 y 8.x del change `add-var-drift-watcher`. Sin el módulo (sin `hooks/` o sin esa API) `/var` solo informa y avisa de que no pudo corregir. Los hooks de `skill.prompt` (respaldo para `/opsx:apply` y `/opsx:verify` escritos a mano) no corren en un plugin instalado bajo una organización que gestiona Claude Code.

## Evals

`evals/` es una suite para `claude plugin eval` que comprueba reglas de comportamiento tras cambiar `bifrost/CLAUDE.md` o una skill. No mide la calidad del texto ni del código.

| Caso | Regla que comprueba |
| --- | --- |
| `odin-incomplete` | Con requisitos incompletos, Odín pregunta y no propone implementar |
| `bifrost-no-waterfall` | Bifröst carga a Odín y no encadena Skuld, Brokkr, Heimdall ni Hela |
| `bifrost-lookup` | Una pregunta sobre el código va a Hugin, sin Odín ni fases de planificación |
| `bifrost-plan-mode-route` | Un refactor sin comportamiento nuevo va a plan mode, no a OpenSpec |
| `skuld-no-name` | Sin nombre de change, Skuld devuelve candidatos y no crea artefactos |
| `brokkr-no-change` | Sin change ni plan, Brokkr devuelve la pregunta y no escribe código |
| `munin-mimir-empty` | Con un Mimir simulado vacío, Munin dice que no hay recuerdos y no inventa |
| `hugin-graphify-no-graph` | Sin `graphify-out/`, Hugin-graphify pregunta o avisa y no construye el grafo |
| `var-no-plan` | `/var` sin plan activo dice que no hay plan que vigilar y no edita nada |
| `var-drift` | Con un plan de tres pasos y trabajo fuera de él, Vár devuelve `desvío` con el paso afectado, sin editar |

```bash
tests/evals.sh                     # una ejecución por caso
tests/evals.sh --runs 3            # más ejecuciones por caso
tests/evals.sh --case 'bifrost-*'  # solo los casos que coinciden con el glob
tests/evals.sh --baseline          # añade el brazo sin plugin (dobla el coste)
```

| Flag | Efecto |
| --- | --- |
| `--runs N` | Ejecuciones por caso, entero >= 1 (por defecto 1) |
| `--case GLOB` | Solo los casos cuyo nombre coincide con el glob |
| `--baseline` | Añade el brazo sin plugin (`--ablation with-without`) |
| `-h`, `--help` | Muestra la ayuda |

Cada ejecución hace llamadas reales con tu credencial. El script va siempre con `--no-publish` (el informe no se sube a claude.ai) y `--max-cost-usd 2`, y no hay flag para cambiar ninguno de los dos; cualquier otro flag muestra la ayuda y sale con 64. Sale con el código de `claude plugin eval` (0 todo pasa, 1 algún caso falla, 2 tope de coste alcanzado, 143 terminado) y al final imprime la ruta del informe. Una pasada completa cuesta alrededor de 1,6 USD con una ejecución por caso, así que `--runs 3` supera el tope: filtra con `--case`.

Los resultados quedan en `evals/results/<fecha>/` (`aggregate-result.json` y `report.html`), ignorados por `.gitignore`. El instalador no ejecuta las evals.

Límites del sandbox de `claude plugin eval`: no tiene `AskUserQuestion` ni `EnterPlanMode`, así que los casos comprueban las preguntas por el texto de la respuesta, y `bifrost-plan-mode-route` usa un grader `llm`. `Bash` solo admite comprobaciones de solo lectura. El Mimir de `munin-mimir-empty` es un simulado de `evals/mocks/mimisbrunnr/`.

## Medir tokens

Para saber cuántos tokens gasta cada especialista antes de optimizar nada. Dos herramientas y un panel; ninguna cambia el comportamiento del panteón.

**Agregador de sesiones.** `scripts/token-report.ts` lee los transcripts de `~/.claude/projects/<proyecto>/` (sesión principal y subagentes) y imprime una tabla por sesión: especialista (`attributionSkill`, o `(sin skill)`), hilo (`principal` o `subagente`), modelo, llamadas, input, output, cache read, cache creation y total. Deduplica las respuestas repetidas por `requestId`. El pie de cada sesión muestra el total real en USD de su última línea `cost-state`; por especialista solo hay tokens, sin tabla de precios. Necesita `bun`, no instala nada.

```bash
bun scripts/token-report.ts                                  # sesiones del cwd
bun scripts/token-report.ts --project /ruta/al/proyecto      # otro proyecto
bun scripts/token-report.ts --session <id> --session <id>    # solo esas sesiones
bun scripts/token-report.ts --since 2026-11-05               # desde esa fecha
```

**Panel de Vár.** `var-panel` muestra los tokens del juez automático de Vár.

**Banco de fases.** `scripts/phase-bench.sh` ejecuta Skuld, Brokkr, Heimdall y Hela, en ese orden, sobre un repo de juguete (`evals/bench/fixture/`, con el change de `evals/bench/change.md`) usando `claude -p`, una sesión por fase, y muestra la tabla del agregador. **Cuesta dinero**: sin `--yes` solo imprime los comandos (dry run); con `--yes` hace llamadas reales, hasta 4 veces el tope por fase (`--budget USD`, por defecto 3, pasado a `--max-budget-usd`). Cada fase limita sus herramientas con `--allowedTools` (Bash solo para `openspec`, `git` y `bash`). No mide Odín ni el camino plan mode (no hay `AskUserQuestion` ni `EnterPlanMode` en `claude -p`) ni a Vár. Si el transcript de una fase no aparece, el agregador lo avisa como sesión no encontrada.

```bash
bash scripts/phase-bench.sh               # dry run, no lanza claude
bash scripts/phase-bench.sh --yes         # ejecuta de verdad
bash scripts/phase-bench.sh --yes --budget 1.5
```

Pruebas sin coste: `bash tests/token-report_test.sh` (fixtures en `tests/fixtures/token-report/`) y `bash tests/phase-bench_test.sh` (con un `claude` falso).

## Cambio incompatible en 1.1.0

`/munin` deja de existir. Usa `/munin-mimir` o `/munin-memory`. Desde Bifröst no hace falta elegir: delega en el backend de la config.

## Cambios en 1.2.0

Nueva skill `nordic-pantheon:hugin-graphify` y flag `--hugin=plain|graphify`. Sin cambios incompatibles: por defecto Hugin sigue leyendo código como antes.

## Cambios en 1.3.0

Nuevo camino plan mode para cambios sin comportamiento que especificar (Bifröst, Odín, Brokkr y Heimdall) y suite de evals (`evals/`, `tests/evals.sh`). Sin cambios incompatibles: el camino OpenSpec y el instalador no cambian.

## Cambios en 1.4.0

Todas las skills fijan `effort` y las del hilo principal (Odín, Forseti, Hela y `/bifrost`) fijan también `model`. Sin cambios incompatibles; Odín y `/bifrost` pasan a `opus` en su turno. Ver "Cambiar el modelo de un especialista".

## Cambios en 1.5.0

Nuevo especialista Vár (`nordic-pantheon:var` y el módulo de hooks `hooks/var.tsx`): vigila el plan aprobado, reconduce desvíos, panel `/var-panel` y notificación. Nuevas claves `VAR_ENABLED`, `VAR_MINUTES` y `VAR_TOOL_CALLS` en la config. Sin cambios incompatibles. Ver "Vár: vigilancia del plan".

## Cambios en 1.6.0

`install.sh` puede instalar el MCP Mimisbrunnr en la CLI (clona, compila y registra) con `--munin=mimir`: nuevo flag `--mimir=install|skip` y pregunta interactiva. Cambia el comportamiento por defecto: con `--munin=mimir` y el MCP sin registrar, `install --yes` ahora clona, compila y sobrescribe `~/.local/bin/mimisbrunnr` y registra el MCP en la CLI. Para el comportamiento anterior (solo avisar), usa `--mimir=skip`. Ver "Instalar Mimisbrunnr".

## Pruebas

```bash
bash tests/install_test.sh
bash tests/evals_test.sh
claude plugin validate .
claude plugin test .
tsc -p .
```

`claude plugin test .` ejecuta `hooks/var.test.tsx` (reloj y `model.complete` simulados, sin llamadas reales). `tsc -p .` comprueba los tipos del módulo con los tipos que el motor deja en `.claude-plugin/types/` al cargar el mod (ignorados por git).

`install_test.sh` ejecuta el instalador con `HOME` temporal y `claude`, `uv`, `pipx`, `graphify`, `git` y `go` falsos, con un `PATH` sin los reales; no toca tu instalación.

`evals_test.sh` ejecuta `tests/evals.sh` con un `claude` falso (`tests/fixtures/evals-bin/claude`): comprueba flags, `--no-publish`, el tope de 2 USD y los códigos de salida sin llamadas reales ni coste.
