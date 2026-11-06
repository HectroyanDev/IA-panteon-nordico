# Design

## Context

Motivación en `proposal.md`; comportamiento en `specs/plan-drift-watch/spec.md`. Estado observado:

- El plugin `nordic-pantheon` solo tiene skills (`skills/*/SKILL.md` + `references/role.md`), `bifrost/CLAUDE.md` y `.claude-plugin/plugin.json` (1.4.0). No tiene `hooks/`. En modo `link` se carga como plugin de carpeta de skills (`~/.claude/skills/nordic-pantheon` → repo); en modo `marketplace`, desde un marketplace de carpeta local.
- `~/.claude/CLAUDE.md` es un symlink a `bifrost/CLAUDE.md`: editar ese archivo basta para Bifröst global y `/bifrost`.
- La config (`${XDG_CONFIG_HOME:-$HOME/.config}/nordic-pantheon/config`) es `CLAVE=valor`; `install.sh` la reescribe entera en `config_write` y la lee con `config_get` (última aparición, sin ejecutarla).
- Plan mode: el plan vive en `~/.claude/plans/<nombre>.md`; `ExitPlanMode` devuelve `{ plan, filePath, ... }` al aprobarse. Brokkr, Heimdall, Skuld y Bragi son skills con `context: fork`: Bifröst las carga con la herramienta `Skill` y corren como bucles de subagente.
- Claude Code ofrece dos mecanismos de hooks. Los **hooks de settings** (comandos en `hooks.json`: `PreToolUse`, `PostToolUse` con `additionalContext`, `SubagentStop`, `Notification`…) lanzan un proceso por evento y no dibujan interfaz. Los **mods** (function hooks: `hooks/hooks.json` con `{ "modules": [...] }` y un módulo TS que exporta `register(on)`) corren en el proceso del motor, con estado de sesión, temporizadores y paneles. Datos de la API de mods (tipos de la versión 2.1.309 que trae la app de escritorio; la CLI local es 2.1.301):
  - `tool.call` se dispara para cada llamada a herramienta, también dentro de subagentes (lleva `agentId`); su resultado admite `context`, texto que el modelo lee tras el resultado de la herramienta (el equivalente a `additionalContext` de `PostToolUse`).
  - `$.session.append({ agentId?, message: { type: 'user', content } })` añade una fila de usuario oculta (`isMeta`, origen el plugin) al hilo principal o a un subagente en curso; entra en la siguiente petición de ese bucle. Con `type: 'system'` es un aviso que el humano ve y el modelo no.
  - `skill.prompt` da el nombre y el texto de cada skill cargada; `$.session.messages({ agentId })` lee la transcripción de un subagente; `$.agent.list()` lista los subagentes vivos, también los de skills `fork`.
  - `$.model.complete({ model, effort, system, prompt })` hace una llamada sin herramientas ni historial con el cliente de la sesión.
  - `$.clock.every/after`, `$.state` (estado de sesión que sobrevive a recargas del módulo), `$.fs`, `$.env`, `$.process.run`.
  - `$.tool.register` registra herramientas propias del plugin (`mcp__nordic-pantheon__*`) que el modelo puede llamar; su handler corre en el módulo, con acceso a `$.state` y a `$.session.append`. Que una skill `fork` las vea está por comprobar (tarea 1.5).
  - `$.ui.open({ id, title })` + `ui.render` en `{ component: 'Pane' }` dibujan un panel lateral (superficies `terminal`, `desktop`, `vscode`, `mobile`); `$.ui.toast`, `$.ui.status`; `$.command.register` para un comando propio.
  - `$.ui.notify` lanza una notificación nativa, pero sus tipos documentan `no-surface` "en el escritorio: solo corren los hooks". No está claro que funcione en la app.
  - La API es de acceso anticipado y cambia entre versiones.

## Goals / Non-Goals

**Goals:**
- Vigilar sin coste cuando no hay plan activo ni la tarea es corta (ningún juicio, ninguna llamada a modelo).
- Reconducir subagentes en curso sin pararlos ni esperar al humano.
- Una sola fuente del criterio de desvío, compartida por la vigilancia automática y por `/var`.
- Una sola vía de reconducción (inyección, límite, registro, panel y notificación), compartida por la vigilancia automática y por `/var`.
- Poder apagar la vigilancia automática sin desinstalar nada (`VAR_ENABLED=off`).
- No bloquear al agente vigilado mientras se juzga.

**Non-Goals:**
- Vigilar sesiones en la nube o sesiones sin la app de escritorio (el módulo carga en la CLI también, pero el diseño y las pruebas se centran en la app).
- Guardar el registro entre sesiones.
- Decidir si el plan es bueno: Vár solo compara contra él.

## Decisions

### D1. Skill de Vár + módulo de hooks en el mismo plugin
Vár son dos piezas del plugin `nordic-pantheon`:
- `skills/var/SKILL.md` + `references/role.md` (contrato de rol, como el resto) + `references/judge.md` (el criterio de alineación y el formato JSON del veredicto). `/var` corre en subagente (`context: fork`, `opus`, `high`) para la comprobación puntual; juzga, pero no inyecta: entrega el veredicto al módulo (D12).
- `hooks/hooks.json` (`{ "modules": ["./var.tsx"] }`) y `hooks/var.tsx` (más módulos auxiliares en `hooks/var/`): detección del plan, contadores, disparo, juicio, reconducción, registro, panel, notificación y las herramientas `var_status`/`var_report` que usa `/var`. Contrato de `$.state` en `types/index.d.ts`, enlazado desde `plugin.json` (`"types"`).

Reparto: la skill decide (el juicio); el módulo actúa (inyectar, contar, registrar, mostrar, notificar). Así la reconducción vive en un solo sitio, sea cual sea el origen del veredicto.

El módulo lee `references/judge.md` en cada activación y lo manda como `system` del juicio, así el criterio vive en un solo archivo.

*Alternativas*: (a) solo hooks de settings (comandos bash/node en `hooks.json`): sin panel, sin temporizador propio (el tiempo solo se mide cuando llega un evento), estado en archivos con carreras entre subagentes paralelos, un proceso por llamada a herramienta. Descartada como mecanismo principal; se queda como reserva de inyección (D6). (b) Un plugin aparte solo para el mod: dos instalaciones y dos versiones que mantener alineadas. Descartada. (c) Vár como subagente que Bifröst lanza y que vuelve a mirar cada X: un subagente no puede programarse a sí mismo ni ver las llamadas de otros bucles. Descartada.

### D2. Detección del plan activo
- **Plan mode**: hook `tool.call` en `ExitPlanMode`: `await next(e)`; con un resultado sin `deny` ni `isError` y con `filePath`, activa el plan con esa ruta (si no hay `filePath` pero sí `plan`, guarda el texto). Reserva: la fila `plan_mode_exit` de `session.append` trae `planFilePath` y `hasPlan`. La tarea 1.2 fija cuál es fiable para distinguir aprobado de rechazado.
- **OpenSpec**: hook `tool.call` en `Skill` (antes de `next`, porque una skill `fork` mantiene la llamada abierta hasta que termina) y `skill.prompt` como respaldo, para `nordic-pantheon:brokkr`, `openspec-apply-change` y `opsx:apply`. El nombre del change sale de los argumentos (`openspec/changes/<name>` o un kebab-case que exista en `openspec/changes/`). Sin nombre: `openspec list --json` con `$.process.run` en el directorio de la sesión; con un único change activo, ese; con cero o varios, no se activa y el panel lo anota. El plan es `tasks.md`; `proposal.md` y `design.md` van al juicio como contexto, recortados.
- Con un plan del camino plan mode ya activo, cargar Brokkr no cambia la fuente.
- **Con `VAR_ENABLED=off`** (D11) la detección sigue corriendo, porque es barata y `/var` la usa a través de `var_status`, pero el plan queda en estado `desactivado`: sin contadores, sin búferes, sin juicios automáticos y sin abrir el panel.
- **Fin**: llamada a `Skill` con `nordic-pantheon:heimdall`, `openspec-verify-change`, `opsx:verify`, `nordic-pantheon:hela`, `openspec-archive-change` u `opsx:archive`; todas las casillas de `tasks.md` marcadas (se comprueba en cada juicio y tras cada `Edit`/`Write` de ese archivo); otro `ExitPlanMode` aprobado (sustituye); `session.end`.

*Alternativa*: leer el plan más reciente de `~/.claude/plans/` o el change modificado más tarde. Descartada: activaría vigilancia sobre planes viejos o no aprobados.

### D3. Contadores y ventana
- Hook `tool.call` sin matcher: con plan activo (no `desactivado`), suma 1 al contador de la ventana y apunta en un búfer por hilo (`agentId` o `main`) un resumen de la llamada: herramienta, ruta, patrón o comando (recortado a 200 caracteres) y si dio error. Nunca guarda resultados de herramientas. Búfer acotado (últimas 60 por hilo). Las llamadas del subagente de `/var` no cuentan ni se apuntan: el módulo marca su `agentId` al detectar que se carga `nordic-pantheon:var` (`Skill` o `skill.prompt`; la tarea 1.5 fija la señal) o, como tarde, en su primera llamada a `var_status`; si no se puede identificar antes, sus primeras llamadas de solo lectura cuentan (coste: adelantar algo el siguiente juicio).
- `$.clock.every(30_000)` arrancado en `session.start` comprueba el tiempo. El contador de llamadas se comprueba en el propio `tool.call`.
- Disparo: `llamadas ≥ VAR_TOOL_CALLS` o `minutos ≥ VAR_MINUTES` desde el inicio de la ventana. Si la ventana llega al tiempo con 0 llamadas (esperando al humano), se reinicia sin juzgar: no hay nada que comparar.
- Tras cada juicio, la ventana empieza de nuevo (contadores a cero, búferes vaciados). "El siguiente umbral" se interpreta como otra ventana completa de `VAR_MINUTES`/`VAR_TOOL_CALLS`. Un juicio de `/var` aplicado sobre el plan vigilado también reinicia la ventana: acaba de revisar esa actividad y juzgarla otra vez enseguida sería coste sin información nueva.
- Un solo juicio a la vez. Mientras corre, se sigue contando en la ventana nueva.
- Estado en `$.state` (no en variables del módulo, que se pierden al recargar).

### D4. Juicio con `$.model.complete`
El juicio se lanza desde `$.clock.after(0, …)` para que no consuma el presupuesto del `tool.call` que lo disparó ni bloquee al agente. Llamada: `model: 'opus'`, `effort: 'high'`, `system` = `judge.md` (bloque cacheado), `prompt` = plan (archivo de plan o `tasks.md` con su estado de casillas, más contexto recortado), y por cada hilo con actividad en la ventana: su búfer de llamadas y sus últimos mensajes de asistente (`$.session.messages({ agentId })`, últimos 6, recortados). Respuesta en JSON estricto:

```json
{ "threads": [ { "thread": "main|<agentId>", "verdict": "alineado|menor|desvío",
  "planStep": "…", "reason": "…", "correction": "…" } ] }
```

JSON no válido → un reintento; si vuelve a fallar, se registra "juicio fallido" y no se inyecta nada. `timeoutMs` de 120 s. El criterio de `judge.md`: `desvío` solo si la actividad de la ventana trabaja en algo que ningún paso del plan cubre o salta pasos sin motivo; explorar, leer o probar al servicio del paso en curso es `alineado`; errores de código y calidad no cuentan (eso es de Heimdall).

*Alternativa*: `$.agent.spawn` de un tipo de agente `nordic-pantheon:var` con herramientas para leer diffs. Más contexto, pero un bucle completo de `opus` por juicio, más lento y caro, y sus propias llamadas a herramientas pasarían por los hooks (los de un `spawn` del propio plugin se saltan ese hook, pero complica el conteo). Descartada para la vigilancia; `/var` manual sí tiene herramientas porque es puntual.

### D5. Reconducción del hilo principal y de subagentes en curso (riesgo técnico)
Una sola función del módulo (`applyVerdict(verdict, origen)`) recibe el veredicto, venga del juicio automático (D4) o de `/var` (D12), y hace todo lo que sigue más D6, D7, D8 y D10. Para `desvío`, mecanismo elegido, en este orden:
1. **`$.session.append` en el bucle que se desvió**: `{ agentId, message: { type: 'user', content: [{ type: 'text', text: <corrección> }] } }` (sin `agentId` para el hilo principal). La fila entra en la siguiente petición de ese bucle sin esperar a una llamada a herramienta, el bucle no se para y el humano no interviene. El motor guarda el plugin como origen de la fila.
2. **Reserva en el siguiente `tool.call` del hilo**: si el `append` se rechaza (bucle que ningún plugin puede modificar), la corrección queda pendiente para ese `agentId` y el hook `tool.call` la añade como `context` del resultado de su siguiente llamada (lo mismo que `additionalContext` de `PostToolUse`).
3. **Subagente ya terminado**: si `$.agent.list()` no lo tiene o el `append` responde que no hay bucle vivo, la corrección va al hilo principal nombrando el subagente, para que Bifröst decida si vuelve a delegar.

Además, cada corrección deja un aviso `type: 'system'` en la transcripción principal (lo ve el humano, no el modelo).

Como mucho una corrección por hilo y ventana: si un juicio automático y uno de `/var` coinciden sobre el mismo hilo, el segundo `desvío` se registra sin inyectar otra vez.

*Alternativas para subagentes*: (a) `PostToolUse` de settings con `additionalContext`: también llega a subagentes, pero solo tras una llamada y desde un proceso aparte sin el veredicto asíncrono; queda cubierto por la reserva 2 dentro del mod. (b) Denegar la siguiente llamada (`PreToolUse`/`deny`) con el motivo: obliga a leer la corrección, pero rompe una llamada que quizá era legítima. Descartada. (c) `SubagentStop` con bloqueo: solo actúa al final, tarde. Descartada. (d) `SendMessage` al agente: es una herramienta del modelo, no del plugin, y solo para agentes con nombre. Descartada. (e) Parar y relanzar el subagente: pierde su contexto. Descartada.

### D6. Forma y confianza de la corrección
Plantilla fija, con los campos del veredicto recortados (300 caracteres cada uno):

```
[Vár · corrección del plan]
Plan: <ruta>. Paso que toca: <planStep>.
Desvío: <reason>. Deja de: <correction>.
Esto solo recuerda el plan aprobado; no añade pasos ni autoriza nada fuera de él.
```

El juicio automático no recibe resultados de herramientas (solo nombres y argumentos) para reducir la superficie de inyección desde contenido externo. `/var` sí lee código; por eso sus campos pasan por la misma plantilla y el mismo recorte en el módulo, que no inyecta texto libre de la skill. `bifrost/CLAUDE.md` y el `role.md` de Brokkr ganan la regla: una corrección de Vár recuerda el plan; se sigue si cuadra con él y nunca cuenta como permiso del humano.

### D7. Desvío persistente
Por hilo se cuentan las correcciones enviadas desde su último `alineado`, sin distinguir origen: las de `/var` cuentan igual que las automáticas. Con 2 correcciones y un nuevo `desvío` (de cualquier origen), no se inyecta más en ese hilo, se marca `persistente` y se notifica. Un `alineado` (de cualquier origen) pone el contador a cero.

### D8. Registro y estado
Contrato en `types/index.d.ts` (`interface PluginState { 'nordic-pantheon': { … } }`): `watch` (fuente, ruta, activación, `enabled` y si viene de la config, umbrales y si vienen de la config, inicio de ventana, contadores, estado `activo|desactivado|cerrado|sin-plan|ambiguo`, `agentId` del `/var` en curso si lo hay), `log` (lista de entradas: hora, origen `auto|manual`, hilo, veredicto, paso, motivo, corrección enviada y por qué vía) y `threads` (correcciones por hilo, persistente). Solo sesión: nada de `$.store`, nada de Munin.

### D9. Panel y comando
- `ui.render` en `{ component: 'Pane', requestId: 'var' }` con los elementos de `$.ui.resolve(e)`, igual en `terminal` y `desktop`: cabecera con el plan y su fuente, contadores `n/VAR_TOOL_CALLS llamadas · m/VAR_MINUTES min`, último juicio y el registro (más reciente arriba), con `desvío` y `persistente` destacados y la corrección debajo.
- Se abre solo con `$.ui.open({ id: 'var', title: 'Vár' })` al activar un plan con `VAR_ENABLED=on`; si la superficie no lo coloca (`isPlaced: false`), queda `$.ui.status` con el resumen. Con `off` no se abre solo, tampoco cuando `/var` corrige: el humano acaba de pedir `/var` y ve su resultado; la notificación (D10) y el aviso `system` (D5) bastan.
- `$.command.register({ name: 'var-panel' })` abre el panel a mano (abierto por el humano, siempre se coloca), también con `off`; en ese caso la cabecera dice "vigilancia automática desactivada" y muestra el registro de `/var`. No se usa `/var` porque es la skill.
- Las entradas del registro llevan su origen (`auto` o `/var`).

### D10. Notificación
Se notifica cada `desvío` y cada `persistente`, del origen que sea (también con `VAR_ENABLED=off` si viene de `/var`). `$.ui.notify(texto, { title: 'Vár' })` y `$.ui.toast`. Si `notify` responde `isSent: false` con `no-surface` (el caso documentado para la app de escritorio), reserva por plataforma con `$.process.run`: `notify-send 'Vár' <texto>` en Linux (presente en esta máquina), `osascript -e 'display notification …'` en macOS. La tarea 1.4 confirma qué vía funciona en la app.

### D11. Config
Claves: `VAR_ENABLED` (`on`|`off`, por defecto `on`), `VAR_MINUTES` (10) y `VAR_TOOL_CALLS` (40).

Lectura en el módulo al activar cada plan: `$.env.get('XDG_CONFIG_HOME')` o `HOME` + `/.config`, `$.fs.read`, parseo `CLAVE=valor` (última aparición, sin ejecutar nada). Umbrales que no son enteros positivos → 10/40 y aviso en el panel. `VAR_ENABLED` distinto de `on`/`off` (sin distinguir mayúsculas) → `on` y aviso en el panel. Un cambio de config a mitad de sesión rige desde la siguiente activación de plan.

`VAR_ENABLED=off` apaga solo la vigilancia automática (D2, D3, D9). `/var` sigue informando y corrigiendo: es una petición explícita del humano y no tiene coste en segundo plano. *Alternativa*: que `off` apague también la corrección de `/var` y lo deje solo informativo. Descartada: obligaría a tener dos comportamientos de `/var` y el humano que escribe `/var` ya está pidiendo reconducción.

`install.sh`: `config_write` recibe las tres claves; `cmd_install` las toma de `config_get` y, si faltan, usa `on`, 10 y 40. Sin flags nuevos: se cambian editando la config.

### D12. `/var` manual: informa y corrige
Skill en subagente (`opus`/`high`), con herramientas de solo lectura más las dos del módulo.

1. **Plan**, en orden: el encargo (ruta o contenido de plan, nombre de change); `mcp__nordic-pantheon__var_status` (devuelve plan detectado y su estado, incluido `desactivado`, ventana, búferes por hilo con sus `agentId` y registro); si no hay nada, "no hay plan que vigilar" y termina.
2. **Juicio** con `judge.md`, leyendo código y diffs con herramientas de solo lectura. Los hilos a juzgar salen de `var_status` (`main` y los `agentId` con actividad); sin módulo o sin búferes, un único hilo `main`.
3. **Entrega al módulo**: llama a `mcp__nordic-pantheon__var_report` con el veredicto en el formato de D4 (todos los veredictos, no solo los `desvío`, para que queden en el registro). El handler, que corre en el módulo, llama a `applyVerdict(verdict, 'manual')` (D5): inyección por `$.session.append`, reserva por `context`, caída al hilo principal, plantilla de D6 (con `Plan: <ruta>` o "plan del encargo de /var" si vino como texto), límite de D7, registro de D8, notificación de D10, reinicio de ventana de D3. Devuelve qué se inyectó y por qué vía.
4. **Informe**: devuelve a quien lo llamó el veredicto por hilo y lo que `var_report` dijo que se envió, más el bloque JSON del veredicto al final (Output Contract).

Por qué la skill no inyecta directamente: corre como subagente `fork` y solo tiene herramientas de modelo; `$.session.append`, `$.state` y la notificación solo existen dentro del módulo. Las herramientas registradas con `$.tool.register` son el puente: la skill decide y el módulo actúa con la misma función que la vigilancia automática, así no hay dos implementaciones de la reconducción.

Reservas, según lo que confirme la tarea 1.5:
- Si `var_report` no llega al subagente `fork`, el módulo engancha el `tool.call` de `Skill` para `nordic-pantheon:var` (tras `await next(e)`) y extrae el bloque JSON final del resultado. Solo cubre `/var` lanzado por el modelo con `Skill`; si el humano lo escribe y la señal no pasa por `Skill`, el módulo lo busca al terminar ese subagente con `$.session.messages({ agentId })`.
- Si el módulo no está cargado (plugin sin `hooks/` o API no disponible), `/var` solo informa y lo dice: "corrección no aplicada: módulo de Vár no disponible".
- El módulo descarta un segundo informe del mismo `/var` (misma invocación) para no aplicar dos veces.

### D13. Bifröst
- Tabla del panteón: fila `Vár | Vigilar que el trabajo no se desvíe del plan aprobado | nordic-pantheon:var (+ módulo hooks/var.tsx) | Segundo plano (mod), juicio opus, high; /var en subagente, opus, high`.
- Tabla de decisión: "¿Vamos según el plan? / comprobación puntual" → Vár (`/var`, informa y, si hay desvío, corrige); omitir Heimdall salvo que se pida validar. Nota: la vigilancia automática no se invoca, se activa sola con plan aprobado o implementación OpenSpec, salvo `VAR_ENABLED=off`.
- Regla de D6 sobre correcciones de Vár, y que el aviso de desvío persistente se lleva al humano en la entrega.

### D14. Pruebas
- `claude plugin validate .` y `tsc` con los tipos que el motor deja en `.claude-plugin/types/` (añadir a `.gitignore`).
- `hooks/var.test.tsx` con `claude plugin test .`: reloj y `$.model.complete` simulados. Casos: sin plan no hay juicio; activación por `ExitPlanMode`; disparo por llamadas y por tiempo; ventana sin llamadas; `append` a un subagente; reserva por `context`; subagente terminado; persistente; config no válida; fin por Heimdall; `VAR_ENABLED=off` (sin juicios ni panel, `var_status` da `desactivado`); `var_report` con `desvío` (inyección, registro con origen `manual`, notificación, reinicio de ventana); `var_report` tras dos correcciones automáticas (persistente); juicio automático y `var_report` sobre el mismo hilo en la misma ventana (una sola corrección); informe duplicado; llamadas de `/var` fuera del contador.
- Evals `var-no-plan` y `var-drift` (spec `pantheon-evals`).
- `tests/install_test.sh`: `VAR_ENABLED` y umbrales por defecto y conservados.

## Risks / Trade-offs

- [API de mods en acceso anticipado; app 2.1.309 y CLI 2.1.301] → Tareas de comprobación (grupo 1) antes de escribir el módulo; el módulo se tipa contra los tipos que el motor deja junto al plugin; README indica la versión mínima.
- [Un plugin de carpeta de skills o de marketplace puede no cargar `modules` igual que la carpeta de mods] → Tarea 1.1; si no carga, se documenta `CLAUDE_CODE_PLUGIN_DIRS` en `env` de `~/.claude/settings.json` como vía de carga y el instalador lo explica.
- [`$.session.append` a un subagente rechazado en algún tipo de bucle] → Reserva por `context` en su siguiente `tool.call` (D5).
- [Herramientas del módulo no visibles en un subagente `fork`] → Tarea 1.5; reservas de D12 (resultado de `Skill`, transcripción del subagente); en el peor caso `/var` solo informa y lo dice.
- [`/var` y un juicio automático corrigiendo el mismo hilo a la vez] → Una corrección por hilo y ventana (D5); ambos cuentan para el límite (D7).
- [Falsos positivos que distraen al agente] → Solo `desvío` inyecta; `judge.md` conservador; límite de 2 correcciones por hilo (D7).
- [Coste de `opus`/`high`] → Ningún juicio sin plan ni en tareas cortas; `system` cacheado; sin resultados de herramientas en el prompt.
- [Inyección de instrucciones desde contenido que lee el agente] → El juicio no ve resultados de herramientas; corrección con plantilla fija y campos recortados; la regla de D6 impide tratarla como permiso.
- [`$.ui.notify` no funciona en la app] → Reserva por `notify-send`/`osascript` (D10).
- [Subagentes en paralelo con el mismo plan] → Búfer y veredicto por hilo; el contador de la ventana es global, como pide el requisito.
- [Recarga del módulo a mitad de tarea] → Estado en `$.state`; temporizadores se rearman en `register`/`session.start`.

## Migration Plan

1. Modo `link`: el módulo carga en la siguiente sesión. Modo `marketplace`: `./install.sh update`.
2. `./install.sh install` (o `update`) añade `VAR_ENABLED`/`VAR_MINUTES`/`VAR_TOOL_CALLS` a la config si faltan.
3. Apagar sin desinstalar: `VAR_ENABLED=off` en la config (rige desde la siguiente activación de plan). Rollback completo: borrar `hooks/hooks.json` quita el módulo; la skill `/var` sigue funcionando sola, pero solo informa (sin módulo no hay corrección).

## Open Questions

- Diseño visual fino del panel (colores, si el registro se pliega a partir de N entradas): se decide al implementar sin cambiar specs.
