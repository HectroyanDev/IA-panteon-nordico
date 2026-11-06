# Tasks

## 1. Comprobaciones previas de la API de mods

Cada comprobación se hace con un mod de prueba en el scratchpad (cargado con `--plugin-dir` o `CLAUDE_CODE_PLUGIN_DIRS`), no en el repo, y su resultado se anota en `design.md` (Context o la decisión afectada), ajustando D2/D5/D9/D10/D12 si algo los contradice.

- [ ] 1.1 Comprobar que un `hooks/hooks.json` con `modules` dentro de un plugin cargado desde `~/.claude/skills/<name>` (modo `link`) y desde un marketplace de carpeta (modo `marketplace`) carga en una sesión de la app de escritorio y en la CLI, y cómo encuentra el módulo la carpeta del plugin para leer `skills/var/references/judge.md`; verificar con un `$.ui.toast` en `session.start` visible en ambas y la vía de ruta anotada en D1
  - Pendiente de verificación manual en la app. Evidencia estática (tipos 2.1.309): `claude plugin validate` acepta `hooks/hooks.json` con `modules`; `$.plugin.root` da la carpeta del plugin (ruta de `skills/var/references/judge.md` = `$.plugin.root` + ruta relativa). No se ha comprobado la carga en modo `link`/`marketplace` ni en la CLI.
- [ ] 1.2 Comprobar en la app qué recibe un hook `tool.call` de `ExitPlanMode` al aprobar y al rechazar un plan (campos `filePath`, `plan`, `isError`, `deny`) y qué trae la fila `plan_mode_exit`; verificar anotando en D2 la señal elegida para "aprobado"
  - Pendiente de verificación manual en la app. Evidencia estática: el resultado de `ExitPlanMode` trae `plan`, `filePath?` y `planWasEdited`; el módulo trata como aprobado un resultado sin `deny` ni `isError` con `filePath` o `plan`. No se ha comprobado qué recibe el hook al rechazar un plan ni la fila `plan_mode_exit`.
- [ ] 1.3 Comprobar con una skill `context: fork` de prueba que (a) sus llamadas llegan a `tool.call` con `agentId`, (b) `$.agent.list()` la lista mientras corre y (c) un `$.session.append` de tipo `user` con ese `agentId` llega a su siguiente petición (el subagente lo cita en su respuesta); y que la reserva de `context` en `tool.call` también llega; verificar anotando en D5 el resultado de cada vía
  - Pendiente de verificación manual en la app. Evidencia estática: `tool.call` lleva `agentId` en subagentes; `$.agent.list()` lista los subagentes vivos; `$.session.append` con `agentId` rechaza los bucles que no están en marcha (reserva por `context` en el siguiente `tool.call`, que en los tipos es `readonly string[]`). No se ha comprobado con una skill `fork` real.
- [ ] 1.4 Comprobar en la app de escritorio `$.ui.notify` (resultado `isSent`/`reason`), la reserva `notify-send`, y si `$.ui.open` coloca un panel sin pedirlo y con `/var-panel`; verificar anotando en D9/D10 la vía que funciona
  - Pendiente de verificación manual en la app. Evidencia estática: `$.ui.notify` puede devolver `{ isSent: false, reason: 'no-surface' }` (reserva `notify-send`/`osascript`); `$.ui.open` devuelve `isPlaced` (reserva `$.ui.status`). No se ha comprobado qué vía funciona en la app de escritorio.
- [ ] 1.5 Comprobar con la skill `context: fork` de prueba que (a) una herramienta registrada con `$.tool.register` aparece y se puede llamar desde el subagente, y que su handler puede hacer `$.session.append` a otro `agentId` en curso; (b) qué señal da el `agentId` del subagente de una skill tanto si la carga el modelo con `Skill` como si el humano escribe `/<skill>` (`tool.call` de `Skill`, `skill.prompt`, `$.agent.list()`); (c) si el resultado de `Skill` en `tool.call` trae el texto final del subagente; verificar anotando en D12 la vía principal de `var_report` y la reserva elegida, y en D3 cómo se excluyen las llamadas de `/var`
  - Pendiente de verificación manual en la app. Evidencia estática: una herramienta de `$.tool.register` se sirve con un hook `tool.call` sobre `mcp__<plugin>__<name>` (`ToolSpec.isDeferred: false` la deja fuera de ToolSearch); el resultado de `Skill` fork trae `status: 'forked'`, `agentId` y `result` (texto final del subagente). No se ha comprobado que el subagente `fork` la vea, ni la señal del `agentId` con `/<skill>` escrito por el humano.

## 2. Skill de Vár

- [x] 2.1 Crear `skills/var/references/judge.md` con el criterio de D4 (qué es `alineado`, `menor` y `desvío`; que exploración y pruebas al servicio del paso son `alineado`; que bugs y calidad no cuentan) y el esquema JSON del veredicto; verificar que cubre los escenarios de "Juicio de alineación" de `plan-drift-watch`
- [ ] 2.2 Crear `skills/var/SKILL.md` (`context: fork`, `model: opus`, `effort: high`, Activation Contract, Hard Rules, Decision Gates, Execution Steps y Output Contract al estilo de `skills/heimdall/SKILL.md`; pasos de D12: plan desde el encargo o `var_status`, juicio de solo lectura, `var_report` con todos los veredictos, informe con lo que se envió y bloque JSON final; aviso "corrección no aplicada" si el módulo no está) y `skills/var/references/role.md` (contrato de rol en español: alcance, informa y corrige a través del módulo sin inyectar por su cuenta, no solapar con Heimdall, no editar plan ni `tasks.md`, no Munin); verificar con `claude plugin validate .` y que `/var` sin plan responde "no hay plan que vigilar"
  - Hecho: `skills/var/SKILL.md` y `references/role.md`; `claude plugin validate .` pasa. Pendiente de verificación manual: que `/var` sin plan responda "no hay plan que vigilar" (requiere una sesión real).
- [ ] 2.3 Crear `evals/var-no-plan/` y `evals/var-drift/` (plan de tres pasos y resumen fuera del plan en el prompt; `tool_used` `Write`/`Edit` con `max: 0`; `regex` de "no hay plan" y de `desvío` + nombre del paso); verificar con `tests/evals.sh --case 'var-*'` que ambos pasan
  - Hecho: `evals/var-no-plan/` y `evals/var-drift/`. Pendiente: `tests/evals.sh --case 'var-*'` (llama al modelo con sesiones reales; no se ha ejecutado).

## 3. Módulo de hooks: plan, contadores y disparo

- [x] 3.1 Crear `hooks/hooks.json`, `types/index.d.ts` (contrato de `$.state` de D8) y `hooks/var.tsx` con `register`, `session.start` (rearme del reloj) y lectura de config de D11 (`VAR_ENABLED`, `VAR_MINUTES`, `VAR_TOOL_CALLS`, valores no válidos); añadir `"types"` a `.claude-plugin/plugin.json` y `.claude-plugin/types/` a `.gitignore`; verificar con `claude plugin validate .` y `tsc -p .`
- [x] 3.2 Implementar la detección del plan de D2 (`ExitPlanMode`, `Skill`/`skill.prompt` de Brokkr y apply, `openspec list --json`, change ambiguo, fin por Heimdall/verify/Hela/archive/casillas/otro plan/`session.end`, estado `desactivado` con `VAR_ENABLED=off`); verificar con tests en `hooks/var.test.tsx` para cada escenario de "Plan activo en el camino plan mode", "Plan activo en el camino OpenSpec", "Fin de la vigilancia" y "Activación configurable" con `claude plugin test .`
- [x] 3.3 Implementar contadores, búferes por hilo y ventana de D3 (disparo por llamadas, por tiempo, ventana sin llamadas, un solo juicio a la vez, umbrales no válidos, nada con `desactivado`, llamadas de `/var` excluidas según 1.5); verificar con tests de reloj simulado para cada escenario de "Disparo por umbral" y "Umbrales configurables" con `claude plugin test .`

## 4. Módulo de hooks: juicio y reconducción

- [x] 4.1 Implementar el juicio de D4 (`$.model.complete` con `opus`/`high`, `judge.md` como `system` cacheado, prompt sin resultados de herramientas, JSON estricto, un reintento, "juicio fallido"); verificar con tests con `$.model.complete` simulado (JSON válido, no válido dos veces, `timeout`) y que el `tool.call` que dispara no espera al juicio
- [x] 4.2 Implementar `applyVerdict(verdict, origen)` con la reconducción de D5/D6 (`$.session.append` al hilo, reserva por `context` en su siguiente `tool.call`, subagente terminado → hilo principal, aviso `system`, plantilla con campos recortados, `menor` solo se registra, una corrección por hilo y ventana) y el límite de D7 (cuenta ambos orígenes); verificar con tests para cada escenario de "Reconducción sin esperar al humano" y "Límite de correcciones", llamando a `applyVerdict` con origen `auto` y `manual"
- [x] 4.3 Implementar el registro de D8 (con origen) y las herramientas `var_status` y `var_report` de D12 (`var_report` → `applyVerdict(…, 'manual')`, reinicio de ventana, descarte de informe duplicado, respuesta con lo inyectado y la vía) más la reserva elegida en 1.5; verificar con tests: tras una corrección `log` tiene la entrada completa; `var_status` devuelve plan, estado (también `desactivado`), ventana, búferes y registro; `var_report` con `desvío` inyecta, registra con origen `manual`, notifica y reinicia la ventana, también con `VAR_ENABLED=off`; un segundo informe igual no inyecta otra vez

## 5. Módulo de hooks: panel y notificación

- [ ] 5.1 Implementar el panel y `/var-panel` de D9 (apertura al activar solo con `VAR_ENABLED=on`, `isPlaced: false` → `$.ui.status`, desvío y persistente destacados, origen de cada entrada, cabecera "vigilancia automática desactivada" con `off`); verificar con tests de `mount` en `terminal` y `desktop` y a mano en la app de escritorio con un plan aprobado
  - Hecho y probado: panel, `/var-panel` y `$.ui.status` de reserva, con tests de `mount` en `terminal` y `desktop` (`hooks/var.test.tsx`). Pendiente de verificación manual en la app con un plan aprobado.
- [ ] 5.2 Implementar la notificación de D10 con su reserva por plataforma (solo `desvío` y persistente, de ambos orígenes); verificar con tests (`notify` con `no-surface` → `notify-send`; `alineado` no notifica; `desvío` de `var_report` notifica) y a mano en la app con la ventana en segundo plano
  - Hecho y probado: notificación con reserva `notify-send`/`osascript` (tests con `no-surface`, `alineado` sin notificar, `desvío` de `var_report`). Pendiente de verificación manual en la app con la ventana en segundo plano.

## 6. Instalador

- [x] 6.1 Añadir `VAR_ENABLED`, `VAR_MINUTES` y `VAR_TOOL_CALLS` a `config_write` y a `cmd_install` (de `config_get`, por defecto `on`, 10 y 40) según D11; añadir a `tests/install_test.sh` los escenarios "Umbrales de Vár por defecto", "Reinstalar conserva los umbrales de Vár" y "Reinstalar conserva la vigilancia desactivada"; verificar con `bash tests/install_test.sh` entero en verde

## 7. Bifröst, especialistas y documentación

- [ ] 7.1 Actualizar `bifrost/CLAUDE.md` según D13 (fila de Vár en la tabla del panteón, fila en la tabla de decisión con `/var` que informa y corrige, nota de `VAR_ENABLED=off`, regla de correcciones de Vár y aviso de persistente en la entrega); verificar que `~/.claude/CLAUDE.md` refleja el cambio (symlink), que `grep -n 'Vár' bifrost/CLAUDE.md` muestra las tres partes y que `tests/evals.sh --case 'bifrost-*'` sigue en verde
  - Hecho: filas de Vár, de decisión, nota de `VAR_ENABLED=off`, regla de correcciones y aviso de persistente; `grep -n 'Vár' bifrost/CLAUDE.md` muestra las tres partes y `~/.claude/CLAUDE.md` (symlink) lo refleja. Pendiente: `tests/evals.sh --case 'bifrost-*'` (sesiones reales, no ejecutado).
- [ ] 7.2 Añadir a `skills/brokkr/references/role.md` (y al Hard Rules de su `SKILL.md`) la regla de D6 sobre correcciones de Vár; verificar que cubre el escenario "Corrección recibida" y que `tests/evals.sh --case 'brokkr-*'` sigue en verde
  - Hecho: regla en `skills/brokkr/references/role.md` y en el Hard Rules de `skills/brokkr/SKILL.md`. Pendiente: `tests/evals.sh --case 'brokkr-*'` (sesiones reales, no ejecutado).
- [x] 7.3 Actualizar `README.md` (fila de Vár, sección de vigilancia con `VAR_ENABLED` y umbrales, `/var` que informa y corrige también con `off`, panel, `/var-panel`, notificación, versión mínima de Claude Code) y `.claude-plugin/plugin.json` (versión 1.5.0, descripción con Vár); verificar con `claude plugin validate .` y que los comandos del README existen

## 8. Integración

- [ ] 8.1 En la app de escritorio, aprobar un plan de prueba con `VAR_TOOL_CALLS=10`, delegar en Brokkr y forzar un desvío (pedirle en el encargo un refactor fuera del plan); verificar que llega una corrección al subagente, que el panel muestra desvío y corrección, que llega la notificación y que una tarea corta alineada no dispara ningún juicio
  - Pendiente de ejecución manual en la app de escritorio (no se puede automatizar sin sesión real).
- [ ] 8.2 En la app de escritorio, con `VAR_ENABLED=off`, aprobar un plan de prueba, hacer trabajo fuera de él y escribir `/var`; verificar que no hubo juicio automático ni el panel se abrió solo, que `/var` informa del `desvío`, que el hilo recibe la corrección, que llega la notificación y que `/var-panel` muestra la entrada con origen `/var`
  - Pendiente de ejecución manual en la app de escritorio (no se puede automatizar sin sesión real).
- [ ] 8.3 Ejecutar `claude plugin test .`, `bash tests/install_test.sh` y `tests/evals.sh`; verificar los tres en verde sin URL de publicación y comprobar que el plan, `tasks.md` y la memoria no tienen cambios hechos por Vár
  - En verde: `claude plugin test .` (43), `bash tests/install_test.sh` (78) y `bash tests/evals_test.sh` (15), más `claude plugin validate .` y `tsc -p .`. Pendiente: `tests/evals.sh` completo (sesiones reales) y comprobar en una sesión real que Vár no cambia el plan, `tasks.md` ni la memoria (los tests cubren que el módulo no escribe archivos).

## Workflow follow-up

- Validar con Heimdall (`/opsx:verify`) y, si pasa, archivar con Hela.
