# Panteón — Flujos: Camino plan mode

> Borrador para discusión · 2026-11-04. Dice lo mismo que el mockup: vista «Flujos», escenario «Camino plan mode» (`#flujo-plan`, 20 pasos, 3 ramas). Si uno cambia, el otro debe cambiar también.
>
> Etiquetas:
> - **[A]** acordado;
> - **[P]** interpretación, pendiente de validar;
> - **[?]** por decidir;
> - **[V]** hecho verificado en las fuentes del repo.
>
> Complemento de `../../../ONBOARDING.md` (normas y configuración).

---

## 1. La idea [V]

1. **Una sola pregunta decide el camino.** Un refactor, un ajuste o un arreglo no añaden ni modifican comportamiento que merezca spec: van por plan mode y no por OpenSpec. [V]
2. **El plan es el sí explícito.** Odín escribe el plan y Bifröst lo presenta con ExitPlanMode. Aprobarlo sustituye al «Sí, confirmo» de Odín; sin él no se implementa. [V]
3. **Los especialistas se turnan, nunca se hablan.** Hugin aporta hechos del código, Brokkr implementa y Heimdall valida contra el plan; todo pasa por Bifröst. [V]
4. **Vár vigila sola desde la aprobación.** Recuerda el plan si el trabajo se desvía; una corrección no añade pasos ni es permiso. [V]

Los nombres de peticiones, rutas, funciones y changes son ejemplos inventados; el comportamiento sale de las skills, `bifrost/CLAUDE.md`, el README y `hooks/var.tsx`.

---

## Mockup

### Ficha

| Campo | Valor |
| --- | --- |
| id | `flujo-plan` |
| Vista | Flujos (`flujo`) |
| Título | Camino plan mode |
| Subtítulo | Un refactor sin comportamiento nuevo: plan, aprobación, implementación y validación |
| Código de ejemplo | `plan-validacion` |
| Documento | — |

### Piezas del diagrama

Zonas: `channel` Humano · `server` Orquestador · `venue` Hilo principal · `staff` Subagentes · `external` Segundo plano / externo.

| id | Nombre | Subtítulo | Zona | Posición |
| --- | --- | --- | --- | --- |
| `human` | Humano | Desarrollador | channel | 150,320 |
| `bifrost` | Bifröst | Orquestador | server | 560,320 |
| `odin` | Odín | Requisitos y plan | venue | 330,100 |
| `hugin` | Hugin | Explora el código | staff | 800,100 |
| `brokkr` | Brokkr | Implementa | staff | 1090,430 |
| `heimdall` | Heimdall | Valida contra el plan | staff | 1090,220 |
| `var` | Vár | Vigila el plan | external | 800,560 |
| `munin` | Munin | Memoria | staff | 400,560 |
| `forseti` | Forseti | Commits | venue | 130,560 |

**Grupos:** ninguno (el color de cada caja marca su zona).

### Conexiones

| id | De | A | Etiqueta | Tipo |
| --- | --- | --- | --- | --- |
| `bf_h` | `bifrost` | `human` | conversación | normal |
| `bf_odin` | `bifrost` | `odin` | encargo | normal |
| `odin_h` | `odin` | `human` | preguntas | normal |
| `bf_hugin` | `bifrost` | `hugin` | encargo | normal |
| `bf_brokkr` | `bifrost` | `brokkr` | encargo completo | normal |
| `bf_heimdall` | `bifrost` | `heimdall` | encargo | normal |
| `var_brokkr` | `var` | `brokkr` | corrección | normal |
| `bf_munin` | `bifrost` | `munin` | ofrece | setup (línea discontinua: ofrecido, no se ejecuta sin un sí) |
| `bf_forseti` | `bifrost` | `forseti` | ofrece | setup (línea discontinua: ofrecido, no se ejecuta sin un sí) |

Una respuesta usa la misma conexión «al revés».

### Aparatos

| id | Tipo | Nombre | Piezas que representa |
| --- | --- | --- | --- |
| `chat-plan` | desktop | Conversación en Claude Code | `human` |
| `panel-var` | desktop | Panel de Vár | `var` |

### Pantallas

**Al empezar:** todo apagado.

#### `chat-plan` · `request`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «Extrae la validación del formulario de checkout a un módulo aparte»

#### `chat-plan` · `permission`
- Pantalla nativa: EnterPlanMode
- Arriba
- Texto pequeño: «Bifröst: refactor sin comportamiento nuevo. ¿Entro en plan mode?»
- Opciones de botón: «Entrar en plan mode» (seleccionada) · «No, déjalo»

#### `chat-plan` · `question`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Odín: ¿qué formularios entran?»
- Opciones de lista: «Solo CheckoutForm» (seleccionada) · «CheckoutForm y ProfileForm»
- Texto pequeño (gris): «Por qué: define cuántos archivos toca el plan.»

#### `chat-plan` · `answered`
- Arriba
- Texto pequeño (gris): «Tus respuestas»
- Filas: Alcance = CheckoutForm · Hecho cuando = tests actuales y nuevos

#### `chat-plan` · `writing`
- Spinner
- Texto pequeño: «Odín escribe el plan»

#### `chat-plan` · `plan`
- Panel clave-valor «~/.claude/plans/quiet-river-42.md» (etiqueta «ExitPlanMode»): Requisitos = solo CheckoutForm, sin cambiar comportamiento · Enfoque = CheckoutForm.jsx:24-71 → checkoutValidation.js · Pasos = 4, cada uno con su comprobación · Verificación = npm test · npm run lint

#### `chat-plan` · `approved`
- Éxito ✓
- Icono ✓
- Título: «Plan aprobado»
- Texto pequeño (gris): «Es tu sí explícito»

#### `chat-plan` · `implementing`
- Spinner
- Texto pequeño: «Brokkr implementa el plan»

#### `chat-plan` · `validating`
- Spinner
- Texto pequeño: «Heimdall valida contra el plan»

#### `chat-plan` · `rejected`
- Pantalla nativa: ExitPlanMode
- Arriba
- Título: «Plan rechazado»
- Texto pequeño: ««Incluid también los mensajes de error en el módulo»»
- Texto pequeño (gris): «Sigues en plan mode. No se implementa nada.»

#### `chat-plan` · `deliveryDone`
- Arriba
- Filas: Qué se hizo = checkoutValidation.js · Qué queda = commit, aprendizajes
- Opciones de botón: «Commit (Forseti)» (seleccionada) · «Guardar aprendizajes (Munin)»

#### `chat-plan` · `criticalDelivery`
- Arriba
- Error
- Título: «Heimdall: 1 CRITICAL»
- Texto pequeño: «Paso 4: npm run lint falla (2 avisos)»
- Opciones de botón: «Que Brokkr lo corrija» (seleccionada) · «Lo reviso yo»

#### `panel-var` · `active`
- Panel clave-valor «Vár · vigilancia del plan»: Plan = quiet-river-42.md · Ventana = 0/40 llamadas · 0/10 min · Registro = Sin juicios todavía

#### `panel-var` · `running`
- Panel clave-valor «Vár · vigilancia del plan»: Ventana = 23/40 llamadas · 6/10 min (resaltado) · Registro = Sin juicios todavía

#### `panel-var` · `closed`
- Panel clave-valor «Vár · vigilancia del plan»: Estado = Vigilancia cerrada (resaltado) · Motivo = Empezó Heimdall

#### `panel-var` · `drift`
- Panel clave-valor «Vár · vigilancia del plan»: auto · Brokkr = desvío · ProfileForm.jsx (resaltado) · Paso = 2. Sustituir la función inline · Corrección = inyectada en Brokkr

#### `panel-var` · `persistent`
- Error
- Panel clave-valor «Vár · vigilancia del plan»: Desvío persistente = Brokkr: ya no se corrige (resaltado) · Correcciones = 2/2 · Decide = tú

### Pasos

#### 1. Pides un refactor
- **Quién:** Tú, en la conversación
- **Dónde:** pieza `human`
- **Pantallas:** `chat-plan` → `request`
- **Qué ocurre:** Escribes la petición en lenguaje natural. No hace falta invocar a nadie: Bifröst la recibe y la clasifica.
- **Qué viaja:**
  ```
  Tú: Extrae la validación del formulario de checkout a un módulo aparte
  ```

#### 2. Bifröst clasifica: sin comportamiento nuevo, plan mode
- **Quién:** Bifröst
- **Dónde:** pieza `bifrost`
- **Qué ocurre:** Aplica una sola pregunta: ¿añade o modifica comportamiento que merezca spec? Aquí no (es un refactor), así que el camino es plan mode y no OpenSpec.
- **Qué viaja:**
  ```
  Clasificación: refactor, no mecánico
  ¿Añade o modifica comportamiento que merezca spec? No
  → plan mode (sin Skuld, sin Hela, sin openspec/)
  ```
- **Clave:** Si Bifröst duda entre los dos caminos, te pregunta cuál seguir con AskUserQuestion antes de entrar en plan mode.
- **Fuente:** bifrost/CLAUDE.md · Procedimiento, paso 1

#### 3. Bifröst pide permiso para entrar en plan mode
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-plan` → `permission`
- **Qué ocurre:** Llama a EnterPlanMode y la app te pide permiso. Con un sí, la sesión pasa a solo lectura y planificación.
- **Qué viaja:**
  ```
  EnterPlanMode
  ← ¿Entrar en plan mode?  [Entrar en plan mode] [No, déjalo]
  ```
- **Ojo:** Si lo rechazas, Bifröst para, no edita ningún archivo y te ofrece el camino OpenSpec o dejarlo.
- **Fuente:** bifrost/CLAUDE.md · Camino plan mode, paso 1

#### 4. Bifröst carga a Odín en el hilo principal
- **Quién:** Bifröst → Odín
- **Dónde:** conexión `bf_odin`
- **Qué ocurre:** Odín escribe el plan. Corre en el hilo principal porque pregunta; por eso no se le delega como a un subagente.
- **Clave:** En plan mode manda el panteón: los subagentes genéricos Explore y Plan que propone la app no se lanzan.
- **Fuente:** bifrost/CLAUDE.md · Camino plan mode, pasos 2 y 3

#### 5. Odín te pregunta lo que falta
- **Quién:** Odín → tú
- **Dónde:** conexión `odin_h`
- **Pantallas:** `chat-plan` → `question`
- **Qué ocurre:** Separa lo conocido de lo desconocido y pregunta solo lo que bloquea, con AskUserQuestion. Cada pregunta lleva su porqué y qué cambia según la respuesta.
- **Qué viaja:**
  ```
  AskUserQuestion
  1. ¿Qué formularios entran?  [Solo CheckoutForm] [CheckoutForm y ProfileForm]
     Por qué: define cuántos archivos toca el plan.
  2. ¿Qué cuenta como hecho?  [Tests actuales en verde] [Actuales y tests nuevos del módulo]
  ```
- **Clave:** Odín está en el hilo principal: es la misma conversación, por eso te pregunta él directamente y no a través de Bifröst.
- **Fuente:** skills/odin/references/plan-mode.md

#### 6. Respondes
- **Quién:** Tú → Odín
- **Dónde:** conexión `odin_h` al revés
- **Pantallas:** `chat-plan` → `answered`
- **Qué ocurre:** Eliges «Solo CheckoutForm» y «Actuales y tests nuevos del módulo». Odín no continúa sin tu respuesta.

#### 7. Odín necesita hechos del código y se los pide a Bifröst
- **Quién:** Odín → Bifröst
- **Dónde:** conexión `bf_odin` al revés
- **Qué ocurre:** Odín no explora el código. Devuelve a Bifröst lo que necesita saber: dónde vive la validación y quién la usa.
- **Qué viaja:**
  ```
  Necesito: ¿dónde está la validación del checkout y quién la usa?
  Sin ese dato, "Enfoque" quedaría como desconocido.
  ```
- **Fuente:** skills/odin/references/plan-mode.md · Flow, paso 2

#### 8. Bifröst delega la búsqueda en Hugin
- **Quién:** Bifröst → Hugin
- **Dónde:** conexión `bf_hugin`
- **Qué ocurre:** Hugin es un subagente: no ve la conversación, así que el encargo es completo. Los subagentes de solo lectura funcionan en plan mode.
- **Qué viaja:**
  ```
  Encargo a Hugin (solo lectura)
  Objetivo: localizar la validación del formulario de checkout y sus usos
  Contexto: refactor sin cambio de comportamiento; alcance solo CheckoutForm
  Devuelve: estado actual, rutas con su porqué, riesgos o huecos
  ```
- **Fuente:** bifrost/CLAUDE.md · Especialistas en subagente

#### 9. Hugin devuelve su brief
- **Quién:** Hugin → Bifröst
- **Dónde:** conexión `bf_hugin` al revés
- **Qué ocurre:** Hugin lee código real y entrega un brief estructurado. Bifröst se lo pasa a Odín: Hugin no habla con Odín.
- **Qué viaja:**
  ```
  ## Exploración: validación del checkout
  Estado actual: validateCheckout() vive inline en CheckoutForm.jsx
  Áreas afectadas:
  - src/components/CheckoutForm.jsx:24-71: la función y su único uso
  - src/components/CheckoutForm.test.jsx: 9 casos que la cubren
  Riesgos: ProfileForm.jsx tiene una copia parecida (fuera de alcance)
  ```
- **Fuente:** skills/hugin/references/exploration-output.md

#### 10. Odín escribe el plan
- **Quién:** Odín
- **Dónde:** pieza `odin`
- **Pantallas:** `chat-plan` → `writing`
- **Qué ocurre:** Con tus respuestas y el brief, escribe el plan en el archivo que indica la app, con las secciones Requisitos, Enfoque, Pasos (cada uno con su comprobación) y Verificación. Es lo único que escribe.
- **Qué viaja:**
  ```
  # Extraer la validación del checkout
  ## Requisitos
  - Hecho cuando: tests actuales en verde y tests nuevos del módulo
  - Fuera de alcance: ProfileForm, mensajes de error
  ## Pasos
  - [ ] 1. Crear src/lib/validation/checkoutValidation.js con validateCheckout() — npm test -- checkoutValidation
  - [ ] 2. Sustituir la función inline por el import — npm test -- CheckoutForm
  - [ ] 3. Añadir tests del módulo — checkoutValidation.test.js pasa
  - [ ] 4. Limpiar imports — npm run lint sin avisos
  ## Verificación
  - npm test · npm run lint · grep -rn validateCheckout src
  ```
- **Clave:** El plan es lo que apruebas y lo que Brokkr, Heimdall y Vár usan como referencia: nadie lo modifica después.
- **Fuente:** skills/odin/references/plan-mode.md · Plan template

#### 11. Odín devuelve la ruta del plan a Bifröst
- **Quién:** Odín → Bifröst
- **Dónde:** conexión `bf_odin` al revés
- **Qué ocurre:** Entrega la ruta del plan y un resumen de una línea. No pide un "Sí, confirmo": en plan mode la aprobación del plan hace de confirmación.
- **Qué viaja:**
  ```
  Plan: ~/.claude/plans/quiet-river-42.md
  Resumen: extraer validateCheckout() a checkoutValidation.js en 4 pasos
  ```
- **Fuente:** skills/odin/references/plan-mode.md · Flow, paso 4

#### 12. Bifröst presenta el plan con ExitPlanMode
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-plan` → `plan`
- **Qué ocurre:** Ves el plan completo y decides. Hasta que lo apruebes no se lanza a Brokkr: heredaría solo lectura y, además, nada se implementa sin tu sí.
- **Qué viaja:**
  ```
  ExitPlanMode
  plan: ~/.claude/plans/quiet-river-42.md
  ← [Aprobar] [Pedir cambios]
  ```
- **Fuente:** bifrost/CLAUDE.md · Camino plan mode, paso 4

#### 13. Apruebas: es tu sí explícito
- **Quién:** Tú
- **Dónde:** pieza `human`
- **Pantallas:** `chat-plan` → `approved`
- **Qué ocurre:** Aprobar el plan sustituye al "Sí, confirmo" de Odín. Bifröst no te pide otra confirmación de requisitos.

#### 14. Vár se activa sola
- **Quién:** Vár
- **Dónde:** pieza `var`
- **Pantallas:** `panel-var` → `active`
- **Qué ocurre:** Al aprobar el plan, Vár empieza a vigilar en segundo plano. No se invoca. Cuenta llamadas y minutos de todos los hilos y juzga cuando pasan 10 minutos o 40 llamadas, lo primero que ocurra (valores por defecto).
- **Clave:** Se apaga con VAR_ENABLED=off en la config. Con off, /var sigue funcionando.
- **Fuente:** README.md · Vár: vigilancia del plan

#### 15. Bifröst delega la implementación en Brokkr
- **Quién:** Bifröst → Brokkr
- **Dónde:** conexión `bf_brokkr`
- **Pantallas:** `chat-plan` → `implementing`
- **Qué ocurre:** El encargo es completo: ruta del plan, su contenido íntegro y las decisiones de la conversación que no están en el plan. Brokkr no usa tasks.md ni /opsx:apply.
- **Qué viaja:**
  ```
  Encargo a Brokkr
  Plan: ~/.claude/plans/quiet-river-42.md
  Contenido: (plan íntegro: Requisitos, Enfoque, Pasos, Verificación)
  Decisiones fuera del plan: ninguna
  No modifiques el plan.
  ```
- **Fuente:** skills/brokkr/SKILL.md · Plan-mode path

#### 16. Brokkr implementa los pasos y ejecuta sus comprobaciones
- **Quién:** Brokkr
- **Dónde:** pieza `brokkr`
- **Pantallas:** `panel-var` → `running`
- **Qué ocurre:** Sigue los pasos en orden y ejecuta la comprobación de cada uno. Una comprobación que falla y no sabe arreglar es un bloqueo, no un paso hecho. Si un paso pide una decisión que el plan no toma, para y devuelve la pregunta.
- **Qué viaja:**
  ```
  paso 1  crea src/lib/validation/checkoutValidation.js   ✓ npm test -- checkoutValidation
  paso 2  CheckoutForm.jsx importa validateCheckout        ✓ npm test -- CheckoutForm
  paso 3  checkoutValidation.test.js                       ✓ 6 casos nuevos
  paso 4  limpia imports                                   ✓ npm run lint
  ```
- **Clave:** Mientras tanto Vár cuenta la ventana. Si Brokkr se sale del plan, mira la rama «Vár detecta un desvío».

#### 17. Brokkr devuelve su resumen
- **Quién:** Brokkr → Bifröst
- **Dónde:** conexión `bf_brokkr` al revés
- **Qué ocurre:** Pasos hechos y pendientes, archivos cambiados y bloqueos. Sugiere Heimdall, pero Bifröst no lo lanza sin más: lo decide con la regla anti-waterfall y la naturaleza del plan.
- **Qué viaja:**
  ```
  Pasos: 4/4 hechos, 0 pendientes
  Archivos: src/lib/validation/checkoutValidation.js (nuevo)
            src/lib/validation/checkoutValidation.test.js (nuevo)
            src/components/CheckoutForm.jsx
  Bloqueos: ninguno
  Sugerencia: validar con Heimdall
  ```
- **Fuente:** skills/brokkr/SKILL.md · Output Contract

#### 18. Bifröst delega la validación en Heimdall
- **Quién:** Bifröst → Heimdall
- **Dónde:** conexión `bf_heimdall`
- **Pantallas:** `chat-plan` → `validating` · `panel-var` → `closed`
- **Qué ocurre:** Mismo encargo completo del plan más el resumen de Brokkr. Heimdall valida contra el plan, sin /opsx:verify. Al empezar Heimdall, la vigilancia de Vár se cierra.
- **Fuente:** README.md · Vár: vigilancia del plan; skills/heimdall/SKILL.md

#### 19. Heimdall devuelve el informe: todo en verde
- **Quién:** Heimdall → Bifröst
- **Dónde:** conexión `bf_heimdall` al revés
- **Qué ocurre:** Comprueba cada paso en el código y ejecuta cada punto de Verificación, sin arreglar nada. Clasifica con CRITICAL, WARNING o SUGGESTION; cada hallazgo dice por qué importa.
- **Qué viaja:**
  ```
  Estado: pass
  Pasos 1-4: implementados y comprobados
  Verificación: npm test ✓ · npm run lint ✓ · grep validateCheckout → 2 usos esperados
  SUGGESTION: nombrar los códigos de error como constantes
    Por qué: evita literales repetidos; se detecta con grep del literal
  Siguiente: Forseti (commit) o Munin (aprendizajes). Nunca Hela.
  ```
- **Ojo:** Con todo en verde nunca se ofrece Hela: en este camino no hay change que archivar.
- **Fuente:** skills/heimdall/SKILL.md · Plan-mode path

#### 20. Bifröst entrega y ofrece commit y aprendizajes
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-plan` → `deliveryDone`
- **Qué ocurre:** La entrega cuenta qué se hizo y por qué, qué hizo cada especialista y qué queda. Ofrece a Forseti (commit) y a Munin (aprendizajes), pero no los lanza: nunca hay commit sin que lo pidas. Si la app ofrece una caja de cierre con botones, la decisión final va ahí.
- **Qué viaja:**
  ```
  Qué se hizo: validación extraída a checkoutValidation.js (4 pasos, Heimdall: pass)
  Qué queda: commit y guardar aprendizajes
  Siguiente paso posible: Forseti (commit) · Munin (aprendizajes)
  ```
- **Enlace:** [Detalle del camino en ONBOARDING.md](../../ONBOARDING.md#4-camino-plan-mode)

### ¿Y si…?

#### Rechazas el plan (`plan-rechazado`) · tras el paso 12

##### 1. Pides cambios en el plan
- **Quién:** Tú → Bifröst
- **Dónde:** conexión `bf_h` al revés
- **Pantallas:** `chat-plan` → `rejected`
- **Qué ocurre:** Rechazas el plan o pides cambios. Sigues en plan mode: no se delega en Brokkr y no se edita nada.
- **Fuente:** bifrost/CLAUDE.md · Camino plan mode, paso 4

##### 2. Odín ajusta el plan
- **Quién:** Odín → tú
- **Dónde:** conexión `odin_h`
- **Pantallas:** `chat-plan` → `question`
- **Qué ocurre:** Pregunta lo que siga siendo desconocido (por ejemplo, si los mensajes de error cambian de comportamiento), edita el archivo de plan y vuelve a Bifröst.
- **Fuente:** skills/odin/references/plan-mode.md · Flow, paso 5

##### 3. Bifröst presenta el plan corregido
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-plan` → `plan`
- **Qué ocurre:** Vuelve a usar ExitPlanMode. Solo con tu aprobación el camino sigue en el paso 13: el plan aprobado es el que Brokkr recibe.

#### Vár detecta un desvío (`var-desvio`) · tras el paso 16

##### 1. Vár juzga y marca un desvío en Brokkr
- **Quién:** Vár
- **Dónde:** pieza `var`
- **Pantallas:** `panel-var` → `drift`
- **Qué ocurre:** Al cerrar la ventana, juzga cada hilo con actividad. Brokkr ha editado ProfileForm.jsx, que el plan deja fuera de alcance: veredicto desvío. Juzga solo alineación con el plan, no calidad del código.
- **Qué viaja:**
  ```
  { "thread": "<agentId de Brokkr>", "verdict": "desvío",
    "planStep": "2. Sustituir la función inline por el import",
    "reason": "Edita ProfileForm.jsx, fuera de alcance",
    "correction": "Dejar ProfileForm.jsx y volver al paso 2" }
  ```
- **Clave:** Los literales alineado, menor y desvío van siempre en español: el módulo los compara tal cual.
- **Fuente:** skills/var/references/judge.md

##### 2. Vár inyecta la corrección en el hilo de Brokkr
- **Quién:** Vár → Brokkr
- **Dónde:** conexión `var_brokkr`
- **Qué ocurre:** La corrección usa una plantilla fija, no para a Brokkr ni te espera, y además genera una notificación del sistema. Solo recuerda el plan: no añade pasos ni es un permiso tuyo.
- **Qué viaja:**
  ```
  [Vár · corrección del plan]
  Plan: plan aprobado en esta sesión. Paso que toca: 2. Sustituir la función inline por el import.
  Desvío: edita ProfileForm.jsx, fuera de alcance. Deja de: tocar ProfileForm.jsx.
  Esto solo recuerda el plan aprobado; no añade pasos ni autoriza nada fuera de él.
  ```
- **Fuente:** hooks/var/pure.ts · CORRECTION_TEXT

##### 3. Brokkr vuelve al paso que nombra la corrección
- **Quién:** Brokkr
- **Dónde:** pieza `brokkr`
- **Qué ocurre:** Si la corrección cuadra con el plan, la sigue. Lo que el plan no cubre se pregunta igual: una corrección nunca amplía el alcance.
- **Fuente:** skills/brokkr/SKILL.md · Hard Rules

##### 4. Tras dos correcciones, el desvío es persistente
- **Quién:** Vár
- **Dónde:** pieza `var`
- **Pantallas:** `panel-var` → `persistent`
- **Qué ocurre:** Si el mismo hilo se desvía una tercera vez, Vár ya no corrige: lo marca como persistente, resalta el panel y te notifica. Decides tú.
- **Clave:** ONBOARDING.md resume este límite como «tras dos correcciones»; el README precisa que el siguiente desvío es el persistente.
- **Fuente:** README.md · Vár; hooks/var/pure.ts · MAX_CORRECTIONS

##### 5. Bifröst lo lleva a la entrega
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Qué ocurre:** Si el panel marca un desvío persistente, Bifröst lo incluye en la entrega para que decidas: seguir, volver al plan o parar.
- **Fuente:** bifrost/CLAUDE.md · Panteón

#### Heimdall da un CRITICAL (`heimdall-critical`) · tras el paso 18

##### 1. Heimdall informa de un CRITICAL
- **Quién:** Heimdall → Bifröst
- **Dónde:** conexión `bf_heimdall` al revés
- **Pantallas:** `chat-plan` → `criticalDelivery`
- **Qué ocurre:** Un paso sin implementar o una comprobación que falla es CRITICAL. Aquí, npm run lint da 2 avisos. El informe dice por qué importa y cómo detectarlo la próxima vez.
- **Qué viaja:**
  ```
  Estado: fail
  CRITICAL: paso 4, npm run lint falla (2 avisos: import sin usar en CheckoutForm.jsx)
    Por qué: deja deuda que rompe CI; se detecta ejecutando el linter tras editar imports
  ```
- **Fuente:** skills/heimdall/SKILL.md · Plan-mode path, paso 4

##### 2. Bifröst puede volver a delegar en Brokkr
- **Quién:** Bifröst → Brokkr
- **Dónde:** conexión `bf_brokkr`
- **Qué ocurre:** Con un CRITICAL, Bifröst puede encargar el arreglo a Brokkr con el mismo plan y el informe de Heimdall. Antes cuenta el hallazgo en la entrega.
- **Fuente:** bifrost/CLAUDE.md · Camino plan mode, paso 6

##### 3. Nueva validación antes de cerrar
- **Quién:** Bifröst → Heimdall
- **Dónde:** conexión `bf_heimdall`
- **Qué ocurre:** Tras el arreglo, lo razonable es validar otra vez antes de ofrecer commit. Las fuentes no lo escriben como regla: es una interpretación.
- **Ojo:** Interpretación, no regla escrita.

### Bajo el escenario

#### Puntos clave
- **[Clave] Tu sí es la aprobación del plan:** Nada se implementa antes. Aprobar con ExitPlanMode sustituye al «Sí, confirmo» de Odín.
- **[Clave] Sin artefactos de OpenSpec:** No se invoca a Skuld ni a Hela y no se toca openspec/. El plan vive en el archivo que da la app.
- **[Clave] Validación independiente:** Quien valida (Heimdall) no es quien implementó (Brokkr): una segunda lectura sin el sesgo de quien escribió el código.
- **[Riesgo] Los subagentes no ven la conversación:** Por eso el encargo a Brokkr y a Heimdall lleva el plan íntegro. Si falta algo, devuelven la pregunta a Bifröst.

Además, bajo cada escenario aparecen las secciones de la vista (criterio plan mode u OpenSpec y tabla de intención a especialista), descritas en `PROJECT.md`.

---

## Abierto [?]

La misma lista que el mockup, «Abierto en este escenario».

1. ¿Heimdall vuelve a validar tras el arreglo de Brokkr? Las fuentes dicen que Bifröst puede volver a delegar en Brokkr, no qué ocurre después.

## Acordado [A]

- En plan mode manda el panteón: hechos del código con Hugin, plan con Odín; no se lanzan Explore ni Plan genéricos. [V]
- Con todo en verde se ofrece Forseti (commit) y Munin (aprendizajes), nunca Hela. [V]
- Tras dos correcciones de Vár en un hilo, el siguiente desvío de ese hilo es persistente. [V] (README; ONBOARDING.md lo resume como «tras dos correcciones»)

## Glosario

Sin términos propios de este escenario: todos están en el glosario de `PROJECT.md`.

## Siguiente paso

1. Revisar el escenario con quien use plan mode a diario y comprobar que los datos de ejemplo suenan reales.
