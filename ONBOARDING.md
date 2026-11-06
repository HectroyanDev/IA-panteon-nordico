# Trabajar con Bifröst y el panteón

Guía de consulta para el día a día: cómo decide Bifröst, qué hace cada especialista, qué esperar en cada camino y qué normas vas a notar. Para instalar, configurar o cambiar backends, usa el [README](README.md).

Para ver los flujos paso a paso (plan mode, OpenSpec, Hugin y Munin, revisión de PR con Tyr), abre el mockup [`mockups/flujo-panteon/index.html`](mockups/flujo-panteon/index.html) en el navegador. Es un solo archivo, sin servidor.

## Resumen en 30 segundos

- Hablas con **Bifröst**. Él clasifica tu petición, delega en el **mínimo** de especialistas y te entrega el resultado.
- Los especialistas **no hablan entre sí**: todo pasa por Bifröst.
- Si hay algo que decidir, Bifröst **pregunta y para**. No sigue sin tu respuesta.
- Ninguna fase se encadena sola: tras cada una, Bifröst propone el siguiente paso y espera un sí.
- Nunca hay commit, push ni PR sin que lo pidas.

## Índice

1. [Qué es Bifröst](#1-qué-es-bifröst)
2. [El panteón de un vistazo](#2-el-panteón-de-un-vistazo)
3. [Cómo decide Bifröst](#3-cómo-decide-bifröst)
4. [Camino plan mode](#4-camino-plan-mode)
5. [Camino OpenSpec](#5-camino-openspec)
6. [Anti-waterfall](#6-anti-waterfall)
7. [Cómo se comunican los especialistas](#7-cómo-se-comunican-los-especialistas)
8. [Vár: vigilancia del plan](#8-vár-vigilancia-del-plan)
9. [Normas que vas a notar](#9-normas-que-vas-a-notar)
10. [Tu primer día](#10-tu-primer-día)
11. [Configuración](#11-configuración)

## 1. Qué es Bifröst

Bifröst es el orquestador. Cuatro tareas:

1. **Clasifica** tu petición.
2. **Delega** en el especialista mínimo que hace falta.
3. **Sintetiza** lo que devuelven.
4. **Entrega** y propone el siguiente paso.

No explora código, no especifica, no implementa, no valida, no documenta ni gestiona git como si fuera el especialista. La única excepción son las tareas **mecánicas** (rename, typo, comando exacto): las hace él y termina.

Bifröst es global si instalaste con `--bifrost=link` (orquesta todas las sesiones). Con `--bifrost=skill`, lo activas en una sesión con `/bifrost`. Ver [Bifröst en el README](README.md#bifröst).

## 2. El panteón de un vistazo

| Nombre | Qué hace | Dónde corre |
| --- | --- | --- |
| Bifröst | Orquesta y entrega | Hilo principal |
| Odín | Elicita y confirma requisitos | Hilo principal |
| Hugin (`hugin-graphify` con grafo) | Explora el código | Subagente |
| Munin (`munin-mimir` o `munin-memory`) | Recupera y guarda contexto histórico | Subagente |
| Skuld | Planifica un change OpenSpec | Subagente |
| Brokkr | Implementa | Subagente |
| Heimdall | Valida contra la spec o el plan | Subagente |
| Vár | Vigila que no te desvíes del plan | Segundo plano; `/var` en subagente |
| Bragi | Documenta | Subagente |
| Forseti | Commits, ramas, PRs | Hilo principal |
| Hela | Archiva un change completado | Hilo principal |
| Tyr | Revisa PRs con comentarios inline | Hilo principal (lentes en subagentes paralelos) |

Modelos, esfuerzo y skills exactas: [tabla del README](README.md#el-panteón).

**Por qué unos van en subagente.** Cada subagente trabaja en su propio contexto, con su modelo, y no ensucia la conversación. A cambio, no ve lo que hablaste: Bifröst le pasa un **encargo completo** (objetivo, requisitos confirmados, rutas, decisiones tomadas). Y no puede preguntarte: si le falta un dato, termina y **devuelve la pregunta a Bifröst** con opciones y su porqué. Bifröst te la hace y, con tu respuesta, vuelve a delegar.

**Por qué otros van en el hilo principal.** Odín, Forseti, Hela y Tyr **hablan contigo**: preguntan, piden permiso o enseñan una vista previa antes de publicar. Eso solo se puede hacer en la conversación.

## 3. Cómo decide Bifröst

Elige un **subconjunto** de especialistas, nunca el stack completo por defecto.

| Tu intención | Quién actúa |
| --- | --- |
| Mecánico (rename, typo, comando exacto) | Bifröst, inline |
| Buscar, "¿cómo funciona X?" | Hugin y/o Munin; Bifröst responde |
| Recordar trabajo pasado | Munin (Hugin solo si la memoria está vacía) |
| Trabajo no trivial con requisitos incompletos | Odín |
| Cambio pequeño sin comportamiento nuevo (ajuste, refactor, arreglo) | Plan mode (sección 4) |
| Change sustancial con requisitos confirmados | OpenSpec: Skuld y siguientes (sección 5) |
| Tasks listos, implementar | Brokkr |
| "¿Vamos según el plan?" | Vár (`/var`) |
| "¿Cumple la spec?" | Heimdall; si pasa, ofrece Hela |
| Revisar una PR (URL) | Tyr |
| Documentar | Bragi |
| Commits, ramas, PR | Forseti, con permiso explícito |
| Cerrar o archivar un change | Hela |

**Criterio plan mode vs OpenSpec.** Una pregunta: ¿el cambio **añade o modifica comportamiento que merezca spec**?

- Sí → OpenSpec.
- No (ajuste, refactor, arreglo) → plan mode.
- Si Bifröst duda, te pregunta qué camino seguir antes de entrar en plan mode o de delegar en Skuld.

## 4. Camino plan mode

Para cambios sin comportamiento que especificar. Mismas garantías que OpenSpec (sí explícito antes de implementar, validación independiente después), sin sus artefactos.

| Paso | Qué ocurre | Quién |
| --- | --- | --- |
| 1 | Bifröst entra en plan mode. **La app te pide permiso.** Si lo rechazas, para y no edita nada | Bifröst |
| 2 | Te pregunta lo que falte y escribe el plan con **Requisitos, Enfoque, Pasos** (cada uno con su comprobación) y **Verificación**. Si necesita hechos del código, Bifröst los pide a Hugin | Odín (+ Hugin) |
| 3 | Bifröst te presenta el plan. **Aprobarlo es el sí explícito**; sin él no se implementa. Si pides cambios, sigues en plan mode y Odín ajusta | Bifröst |
| 4 | Implementa los pasos del plan aprobado, sin tocar el archivo de plan | Brokkr |
| 5 | Valida contra los pasos y la Verificación. Severidades CRITICAL, WARNING, SUGGESTION | Heimdall |
| 6 | Con todo en verde, ofrece commit (Forseti) y guardar aprendizajes (Munin). Nunca Hela | Bifröst |

Reglas de este camino:

- **No toca `openspec/`**: no se invoca a Skuld ni a Hela.
- **Manda el panteón**: los hechos del código los saca Hugin y el plan lo escribe Odín, no los subagentes genéricos `Explore` y `Plan` que propone la app.
- El archivo de plan lo da la app (hoy `~/.claude/plans/<nombre-aleatorio>.md`, fuera del repo).
- Tras aprobar, la app puede proponer sesiones paralelas por paso. Bifröst sigue en esta sesión con Brokkr salvo que elijas otra cosa.

Detalle: [Camino plan mode en el README](README.md#camino-plan-mode).

## 5. Camino OpenSpec

Para changes sustanciales. Cada fase es un comando `/opsx:*` y **cada una es opcional** salvo que el contexto la exija.

| Fase | Comando | Especialista |
| --- | --- | --- |
| Planificar (proposal, specs, design, tasks) | `/opsx:propose` | Skuld |
| Implementar | `/opsx:apply` | Brokkr |
| Validar contra la spec | `/opsx:verify` | Heimdall |
| Archivar | `/opsx:archive` | Hela |

Antes de planificar, los requisitos deben estar confirmados (Odín) y el change debe tener nombre. Si falta el nombre, Skuld devuelve candidatos a Bifröst y no crea nada.

**Si el repo no tiene `openspec/`**, Bifröst sugiere ejecutar en su raíz:

```bash
openspec init --tools none
```

Las skills de OpenSpec ya son globales; `--tools claude` las duplicaría en el repo. Si Heimdall encuentra CRITICAL, Bifröst puede volver a delegar en Brokkr. Hela no archiva sin verify superado o un waive explícito tuyo.

## 6. Anti-waterfall

Está prohibido encadenar Odín, propose, apply, verify y archive solo porque sí. Cada fase termina con una entrega de Bifröst que incluye el **siguiente paso posible**, y ese paso **no se ejecuta sin tu sí**.

Ejemplo: Brokkr acaba de implementar. Bifröst te cuenta qué cambió y te propone Heimdall. No lo lanza hasta que dices que sí.

## 7. Cómo se comunican los especialistas

Modelo en **estrella**: Bifröst en el centro, cada especialista en una punta. Los especialistas no se llaman entre sí; cada uno devuelve a Bifröst lo que no le corresponde.

Ejemplo con Hugin y Munin. Cada skill lo dice en su tabla de decisiones:

- Hugin: "Question is only 'what did we do before' → Hand back to Bifröst → Munin, not Hugin".
- Munin (`munin-mimir` y `munin-memory`): "Question is about code structure → Hand back to Bifröst → Hugin".

Con eso, Bifröst puede combinarlos de dos maneras:

| Combinación | Cuándo | Ejemplo |
| --- | --- | --- |
| **Paralelo** | Preguntas independientes y ambos solo leen | "¿Cómo funciona el módulo de pagos y qué decidimos sobre reintentos?" Hugin lee el código, Munin recupera la decisión, Bifröst une las dos respuestas |
| **Secuencia** | Lo que devuelve uno alimenta al otro | Munin recupera una decisión que nombra un archivo o una función y la marca "por verificar" (así lo hace `munin-memory`); Bifröst delega en Hugin para comprobarla contra el código actual |

**Por qué este modelo:**

- **Visión única**: solo Bifröst tiene la conversación completa y puede sintetizar.
- **Encargos acotados**: cada especialista recibe lo que necesita y nada más.
- **Preguntas que no se pierden**: toda duda sube a Bifröst y llega a ti por un único canal (`AskUserQuestion`).

## 8. Vár: vigilancia del plan

Vár comprueba en segundo plano que el trabajo no se desvíe del plan que aprobaste.

| Aspecto | Qué hace |
| --- | --- |
| Activación | Sola, al aprobar un plan con `ExitPlanMode` o al implementar un change OpenSpec (Brokkr o `/opsx:apply`). No se invoca |
| Cuándo juzga | Cada `VAR_MINUTES` minutos o `VAR_TOOL_CALLS` llamadas, lo primero que ocurra |
| Si hay desvío | Inyecta una corrección en el hilo desviado, sin pararlo ni esperarte |
| Qué es una corrección | **Solo recuerda el plan.** No añade pasos ni es permiso tuyo. Lo que el plan no cubre se pregunta igual |
| Desvío persistente | Tras dos correcciones, deja de corregir y te notifica. Bifröst lo lleva a la entrega |
| `/var` | Comprobación puntual: veredicto por hilo (`alineado`, `menor`, `desvío`) y corrige si hay desvío |
| Apagarlo | `VAR_ENABLED=off` en la config. Con `off`, `/var` sigue funcionando |

Vár no valida contra la spec ni ejecuta tests: eso es Heimdall. Detalle, panel y límites de versión: [Vár en el README](README.md#vár-vigilancia-del-plan).

## 9. Normas que vas a notar

| Qué verás | Por qué |
| --- | --- |
| Bifröst **pregunta y para** | No inventa respuestas ni sigue trabajando sin la tuya |
| Preguntas con **opciones concretas y un porqué** | Cada una dice por qué se pregunta y qué cambia según tu respuesta. Se hacen con `AskUserQuestion`, no en texto |
| **No afirma sin verificar** | Si te equivocas, te lo explica con evidencia; si no comprobó algo, lo dice |
| **Commits convencionales** con el trailer `Co-Authored-By` | La coautoría de IA se declara, no se oculta |
| **Nunca push ni PR** sin que lo pidas | Forseti pide permiso explícito antes de actuar |
| **Revisión en contexto fresco** antes de commit, push o PR con código no trivial | Una segunda lectura sin el sesgo de quien lo escribió |
| Responde **en tu idioma** | Contesta en el idioma en que le escribes. Los veredictos de Vár (`alineado`, `menor`, `desvío`) son literales fijos |
| Entregas **didácticas** | Qué se hizo y por qué, qué hizo cada especialista, qué conceptos entran en juego, qué queda |
| Sin tropos de IA | Tampoco en lo que se publica (commits, PRs, comentarios, docs) |

**Precedencia.** Las instrucciones de tu organización mandan sobre las de la app de Claude Code, y estas sobre las de Bifröst. Si la app ofrece un cierre de turno con botones, la decisión final va ahí y no se repite con una pregunta.

Reglas completas: [`skills/_shared/communication.md`](skills/_shared/communication.md).

## 10. Tu primer día

### Cómo pedir cosas

| Forma | Cuándo usarla |
| --- | --- |
| **Lenguaje natural** | Por defecto. Bifröst clasifica y elige especialista |
| **Invocar un especialista** | Cuando ya sabes cuál quieres: `/odin`, `/hugin`, `/munin-mimir` o `/munin-memory`, `/brokkr`, `/heimdall`, `/bragi`, `/forseti`, `/hela`, `/tyr <url PR>`, `/var` |
| **Fase OpenSpec** | `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive` |
| **`/bifrost`** | Solo si instalaste con `--bifrost=skill` |

### Qué esperar

- **Preguntas al principio** en trabajo no trivial: quién lo pide, por qué ahora, qué significa "hecho", restricciones y qué queda fuera. Es Odín, y es normal que tarde unas rondas.
- **Una entrega al final** de cada fase, con tres partes: **qué se hizo**, **qué queda** y **siguiente paso posible**.
- **Permiso explícito** antes de entrar en plan mode, de implementar, de publicar una review o de tocar git.

### Cinco ejemplos

| Petición | Camino que sigue Bifröst |
| --- | --- |
| "Renombra `getUser` a `fetchUser` en este archivo" | Mecánico. Lo hace él y entrega |
| "¿Dónde se calcula el precio final del pedido?" | Hugin explora el código y Bifröst responde. Sin Odín ni planificación |
| "Extrae la validación del formulario a un módulo aparte" | Refactor sin comportamiento nuevo: plan mode. Permiso, Odín escribe el plan, apruebas, Brokkr, Heimdall; luego te ofrece commit |
| "Quiero que los usuarios puedan exportar sus pedidos a CSV" | Comportamiento nuevo: Odín elicita; con requisitos confirmados, Skuld (`/opsx:propose`); implementar es otra decisión tuya |
| "Revisa https://github.com/org/repo/pull/123" | Tyr: tres lentes en paralelo, vista previa de los comentarios, y solo publica con tu sí |

## 11. Configuración

Las opciones del instalador se guardan en `~/.config/nordic-pantheon/config` (o `$XDG_CONFIG_HOME/nordic-pantheon/config`). Bifröst la lee para decidir.

| Clave | Para qué sirve |
| --- | --- |
| `MUNIN_BACKEND` | `mimir` o `memory`: qué skill de Munin usa Bifröst. Ver [Cambiar el backend de Munin](README.md#cambiar-el-backend-de-munin) |
| `HUGIN_BACKEND` | `plain` o `graphify`: qué skill de Hugin usa Bifröst. Ver [Cambiar el backend de Hugin](README.md#cambiar-el-backend-de-hugin) |
| `VAR_ENABLED` | `on` u `off`: vigilancia automática de Vár (`VAR_MINUTES` y `VAR_TOOL_CALLS` ajustan la ventana). Ver [Vár](README.md#vár-vigilancia-del-plan) |
| `REPO_DIR` | Ruta del repo del plugin; Bifröst la usa para localizar `skills/_shared/communication.md` |

Lista completa de claves y valores por defecto: [Configuración en el README](README.md#configuración). Para cambiar el modelo de un especialista: [README](README.md#cambiar-el-modelo-de-un-especialista).
