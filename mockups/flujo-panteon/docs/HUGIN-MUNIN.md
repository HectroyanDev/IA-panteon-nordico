# Panteón — Flujos: Hugin y Munin

> Borrador para discusión · 2026-11-04. Dice lo mismo que el mockup: vista «Flujos», escenario «Hugin y Munin» (`#flujo-memoria`, 10 pasos, 3 ramas). Si uno cambia, el otro debe cambiar también.
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

1. **Hugin y Munin no se hablan.** Cada uno devuelve a Bifröst lo que no es suyo; Bifröst es quien los combina. [V]
2. **Subagentes con encargo completo.** No ven la conversación ni preguntan al humano: si algo bloquea, devuelven la pregunta a Bifröst, que usa AskUserQuestion. [V]
3. **Paralelo o secuencia es criterio de Bifröst.** Lo escrito es «Hugin y/o Munin» y que el trabajo en paralelo exige no tocar los mismos archivos. Que dos búsquedas independientes de solo lectura vayan a la vez es una posibilidad razonable. [P]
4. **Una memoria puede estar desfasada.** munin-memory marca «por verificar» lo que nombra un archivo o una función. [V]

Los nombres de peticiones, rutas, funciones y changes son ejemplos inventados; el comportamiento sale de las skills, `bifrost/CLAUDE.md`, el README y `hooks/var.tsx`.

---

## Mockup

### Ficha

| Campo | Valor |
| --- | --- |
| id | `flujo-memoria` |
| Vista | Flujos (`flujo`) |
| Título | Hugin y Munin |
| Subtítulo | Código y memoria: dos especialistas que no se hablan y un orquestador que une sus respuestas |
| Código de ejemplo | `pagos-reintentos` |
| Documento | — |

### Piezas del diagrama

Zonas: `channel` Humano · `server` Orquestador · `venue` Hilo principal · `staff` Subagentes · `external` Segundo plano / externo.

| id | Nombre | Subtítulo | Zona | Posición |
| --- | --- | --- | --- | --- |
| `human` | Humano | Desarrollador | channel | 160,310 |
| `bifrost` | Bifröst | Orquestador | server | 580,310 |
| `hugin` | Hugin | Explora el código | staff | 990,130 |
| `munin` | Munin | Memoria histórica | staff | 990,490 |

**Grupos:** ninguno (el color de cada caja marca su zona).

### Conexiones

| id | De | A | Etiqueta | Tipo |
| --- | --- | --- | --- | --- |
| `bf_h` | `bifrost` | `human` | conversación | normal |
| `bf_hugin` | `bifrost` | `hugin` | encargo completo | normal |
| `bf_munin` | `bifrost` | `munin` | encargo completo | normal |

Una respuesta usa la misma conexión «al revés».

### Aparatos

| id | Tipo | Nombre | Piezas que representa |
| --- | --- | --- | --- |
| `chat-memoria` | desktop | Conversación en Claude Code | `human` |
| `encargo` | desktop | Lo que recibe y devuelve el subagente | `hugin`, `munin` |

### Pantallas

**Al empezar:** todo apagado.

#### `chat-memoria` · `request`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «¿Cómo funciona el módulo de pagos y qué decidimos sobre los reintentos?»

#### `chat-memoria` · `delivery`
- Arriba
- Texto pequeño (gris): «Entrega de Bifröst»
- Filas: Código = 3 intentos · Decisión = 2026-08-12
- Texto pequeño (gris): «Coinciden: decisión verificada»

#### `chat-memoria` · `graphAsk`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Bifröst: no hay grafo de graphify en este repo. ¿Lo construyo?»
- Opciones de botón: «Construir el grafo ahora» (seleccionada) · «Seguir sin grafo»

#### `chat-memoria` · `graphYes`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «Construir el grafo ahora»
- Texto pequeño (gris): «El permiso vale solo para esa invocación.»

#### `encargo` · `huginBrief`
- Panel clave-valor «Encargo a Hugin» (etiqueta «sonnet · medium»): Objetivo = cómo funciona src/payments/ · Contexto = tienda-web · Ve la conversación = No (resaltado) · Puede preguntarte = No (resaltado)

#### `encargo` · `muninBrief`
- Panel clave-valor «Encargo a Munin» (etiqueta «haiku · low»): Objetivo = decisiones sobre reintentos de pago · Backend = munin-memory · Ve la conversación = No (resaltado) · Puede preguntarte = No (resaltado)

#### `encargo` · `huginResult`
- Panel clave-valor «Hugin devuelve» (etiqueta «brief»): PaymentService.js:18 = charge() con idempotencyKey · retryPolicy.js:5-32 = MAX_ATTEMPTS = 3 (resaltado) · BACKOFF_MS = [1000, 2000, 4000] (resaltado) · Los 4xx = no se reintentan

#### `encargo` · `muninResult`
- Panel clave-valor «Munin devuelve» (etiqueta «[proyecto]»): Decisión = máx. 3 reintentos, 1/2/4 s (resaltado) · Fecha = 2026-08-12 · Nombra = src/payments/retryPolicy.js · Estado = por verificar (resaltado)

#### `encargo` · `huginWrong`
- Panel clave-valor «Encargo a Hugin» (etiqueta «mal enrutado»): Objetivo = ¿qué decidimos sobre los reintentos? (resaltado)

#### `encargo` · `huginHandback`
- Panel clave-valor «Hugin devuelve» (etiqueta «a Bifröst»): Motivo = Question is only 'what did we do before' (resaltado) · Devuelve a = Bifröst → Munin · A Munin = no lo llama él

#### `encargo` · `muninHandback`
- Panel clave-valor «Munin devuelve» (etiqueta «a Bifröst»): Pregunta = ¿quién llama a charge()? · Motivo = Question is about code structure (resaltado) · Devuelve a = Bifröst → Hugin

#### `encargo` · `huginVerify`
- Panel clave-valor «Encargo a Hugin» (etiqueta «verificar»): Objetivo = comprobar la decisión contra el código (resaltado) · Afirmación = 3 intentos, 1/2/4 s · Archivo = src/payments/retryPolicy.js

#### `encargo` · `huginVerified`
- Panel clave-valor «Hugin devuelve» (etiqueta «brief»): retryPolicy.js:5-9 = MAX_ATTEMPTS = 3 (resaltado) · BACKOFF_MS = [1000, 2000, 4000] (resaltado) · Resultado = coincide con la decisión

#### `encargo` · `graphBrief`
- Panel clave-valor «Encargo a Hugin» (etiqueta «hugin-graphify»): Objetivo = cómo funciona src/payments/ · HUGIN_BACKEND = graphify (resaltado) · Construir grafo = sin permiso

#### `encargo` · `graphNo`
- Panel clave-valor «Hugin-graphify devuelve» (etiqueta «a Bifröst»): graphify-out/ = no existe (resaltado) · Fuente = código · Pregunta = ¿Lo construyo? (resaltado)

#### `encargo` · `graphBrief2`
- Panel clave-valor «Encargo a Hugin» (etiqueta «hugin-graphify»): Objetivo = el mismo encargo original · Construir grafo = sí (resaltado)

#### `encargo` · `graphDone`
- Panel clave-valor «Hugin-graphify devuelve» (etiqueta «brief»): graphify-out/ = construido y en .gitignore (resaltado) · Fuente = mixto (grafo + código)

### Pasos

#### 1. Preguntas por el código y por una decisión pasada
- **Quién:** Tú, en la conversación
- **Dónde:** pieza `human`
- **Pantallas:** `chat-memoria` → `request`
- **Qué ocurre:** Una sola frase con dos preguntas: cómo funciona el módulo (el código) y qué se decidió (la historia).
- **Qué viaja:**
  ```
  Tú: ¿Cómo funciona el módulo de pagos y qué decidimos sobre los reintentos?
  ```

#### 2. Bifröst clasifica: buscar, con dos fuentes
- **Quién:** Bifröst
- **Dónde:** pieza `bifrost`
- **Qué ocurre:** Es una búsqueda: no hace falta Odín ni planificar. Una parte es de Hugin (el código) y la otra de Munin (la decisión). Las dos son independientes y de solo lectura, así que pueden lanzarse a la vez. Es un criterio de Bifröst, no una regla escrita.
- **Qué viaja:**
  ```
  Intención: buscar / «¿cómo funciona X?» + recordar trabajo pasado
  → Hugin y/o Munin; Bifröst responde
  Omite: Odín, propose, apply, verify
  ```
- **Ojo:** «En paralelo» es una posibilidad, no una regla: lo escrito es «Hugin y/o Munin» y que el paralelo exige no tocar los mismos archivos.
- **Fuente:** bifrost/CLAUDE.md · Tabla de decisión y Cuándo delegar

#### 3. Bifröst elige las skills según la config
- **Quién:** Bifröst
- **Dónde:** pieza `bifrost`
- **Qué ocurre:** Lee la config del panteón: HUGIN_BACKEND decide entre hugin y hugin-graphify, y MUNIN_BACKEND entre munin-mimir y munin-memory. Aquí: hugin y munin-memory.
- **Qué viaja:**
  ```
  ~/.config/nordic-pantheon/config
  HUGIN_BACKEND=plain    → nordic-pantheon:hugin
  MUNIN_BACKEND=memory   → nordic-pantheon:munin-memory
  ```
- **Fuente:** bifrost/CLAUDE.md · Memoria y Exploración

#### 4. Bifröst delega en Hugin con un encargo completo
- **Quién:** Bifröst → Hugin
- **Dónde:** conexión `bf_hugin`
- **Pantallas:** `encargo` → `huginBrief`
- **Qué ocurre:** Hugin es un subagente: no ve la conversación y no puede preguntarte. El encargo trae todo lo que necesita, y solo la parte de código.
- **Fuente:** bifrost/CLAUDE.md · Especialistas en subagente

#### 5. Bifröst delega en Munin con otro encargo
- **Quién:** Bifröst → Munin
- **Dónde:** conexión `bf_munin`
- **Pantallas:** `encargo` → `muninBrief`
- **Qué ocurre:** Aquí van solo las decisiones. Los dos encargos son independientes y ninguno espera al otro (posibilidad, no regla): los especialistas no se comunican entre sí.
- **Fuente:** bifrost/CLAUDE.md · Memoria

#### 6. Hugin lee el código real
- **Quién:** Hugin
- **Dónde:** pieza `hugin`
- **Qué ocurre:** Sigue entradas, módulos relacionados y tests. Solo lee, nunca adivina sobre el código y no modifica archivos.
- **Fuente:** skills/hugin/SKILL.md · Hard Rules

#### 7. Munin recupera lo que hay en memoria
- **Quién:** Munin
- **Dónde:** pieza `munin`
- **Qué ocurre:** Con el backend memory lee los dos ámbitos (proyecto y global) y abre los archivos cuyo nombre o descripción encajan. No inventa: si no hay nada, lo dice.
- **Fuente:** skills/munin-memory/SKILL.md · Recall

#### 8. Hugin devuelve su brief a Bifröst
- **Quién:** Hugin → Bifröst
- **Dónde:** conexión `bf_hugin` al revés
- **Pantallas:** `encargo` → `huginResult`
- **Qué ocurre:** Estado actual, rutas con su porqué, respuesta directa y riesgos o huecos. Hugin devuelve el control a Bifröst y no continúa con propuestas ni con Munin.
- **Qué viaja:**
  ```
  ## Exploración: módulo de pagos
  Estado actual: PaymentService.charge() llama al proveedor con idempotencyKey;
    los 5xx y timeouts pasan por retryPolicy.js (3 intentos; 1 s, 2 s, 4 s); los 4xx no se reintentan
  Áreas: src/payments/PaymentService.js:18 · src/payments/retryPolicy.js:5-32
         src/payments/webhooks.js · src/payments/retryPolicy.test.js
  ```
- **Fuente:** skills/hugin/references/exploration-output.md

#### 9. Munin devuelve lo recordado, con avisos
- **Quién:** Munin → Bifröst
- **Dónde:** conexión `bf_munin` al revés
- **Qué ocurre:** Cada hallazgo lleva su ámbito ([proyecto] o [global]). Como la decisión nombra un archivo, Munin la marca «por verificar»: una memoria describe lo que era cierto cuando se escribió.
- **Qué viaja:**
  ```
  [proyecto] decision-reintentos-pago.md
  Reintentos de pago: máximo 3, espera 1 s, 2 s, 4 s; solo 5xx y timeouts; los 4xx nunca.
  Decidido el 2026-08-12. Nombra src/payments/retryPolicy.js → por verificar
  [global] sin coincidencias
  ```
- **Clave:** La marca «por verificar» es propia de munin-memory; munin-mimir no la define.
- **Fuente:** skills/munin-memory/SKILL.md · Recall, paso 4

#### 10. Bifröst une las dos respuestas y entrega
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-memoria` → `delivery`
- **Qué ocurre:** Solo Bifröst tiene la conversación completa, por eso sintetiza él. Como Hugin ya leyó retryPolicy.js, puede comparar con lo que dice la decisión y marcarla como verificada (interpretación). Cierra con qué se hizo, qué queda y el siguiente paso posible.
- **Qué viaja:**
  ```
  Cómo funciona: charge() → retryPolicy.js, 3 intentos con espera 1/2/4 s (Hugin)
  Qué decidimos: máx. 3, backoff 1/2/4 s, solo 5xx y timeouts; 2026-08-12 (Munin)
  Comprobación: la decisión coincide con retryPolicy.js:5-9
  Qué queda: nada pendiente. Siguiente paso posible: ninguno obligatorio
  ```
- **Enlace:** [Detalle de la comunicación en ONBOARDING.md](../../ONBOARDING.md#7-cómo-se-comunican-los-especialistas)

### ¿Y si…?

#### Un especialista recibe lo que no es suyo (`devuelve-lo-ajeno`) · tras el paso 3

##### 1. Bifröst manda a Hugin la pregunta de la decisión
- **Quién:** Bifröst → Hugin
- **Dónde:** conexión `bf_hugin`
- **Pantallas:** `encargo` → `huginWrong`
- **Qué ocurre:** Supón que Bifröst se equivoca y manda a Hugin solo «¿qué decidimos sobre los reintentos?». Esa pregunta no es de código.

##### 2. Hugin la devuelve a Bifröst
- **Quién:** Hugin → Bifröst
- **Dónde:** conexión `bf_hugin` al revés
- **Pantallas:** `encargo` → `huginHandback`
- **Qué ocurre:** Su tabla de decisiones lo dice: si la pregunta es solo «qué hicimos antes», se devuelve a Bifröst, que la lleva a Munin. Hugin no llama a Munin.
- **Qué viaja:**
  ```
  Question is only 'what did we do before' → Hand back to Bifröst → Munin, not Hugin
  ```
- **Fuente:** skills/hugin/SKILL.md · Decision Gates

##### 3. Bifröst la delega en Munin
- **Quién:** Bifröst → Munin
- **Dónde:** conexión `bf_munin`
- **Pantallas:** `encargo` → `muninBrief`
- **Qué ocurre:** Bifröst corrige el rumbo y manda la pregunta al especialista correcto, con encargo completo.

##### 4. Y al revés: Munin devuelve una pregunta de código
- **Quién:** Munin → Bifröst
- **Dónde:** conexión `bf_munin` al revés
- **Pantallas:** `encargo` → `muninHandback`
- **Qué ocurre:** Si a Munin le llega «¿quién llama a PaymentService.charge()?», lo devuelve a Bifröst, que la lleva a Hugin. Tanto munin-mimir como munin-memory lo recogen en su tabla.
- **Qué viaja:**
  ```
  Question is about code structure → Hand back to Bifröst → Hugin
  ```
- **Fuente:** skills/munin-mimir/SKILL.md y skills/munin-memory/SKILL.md · Decision Gates

#### En secuencia: Munin primero (`secuencia`) · tras el paso 3

##### 1. Bifröst delega solo en Munin
- **Quién:** Bifröst → Munin
- **Dónde:** conexión `bf_munin`
- **Pantallas:** `encargo` → `muninBrief`
- **Qué ocurre:** Cuando lo que devuelve uno puede alimentar al otro, Bifröst no los lanza a la vez. Empieza por la memoria.

##### 2. Munin devuelve una decisión «por verificar»
- **Quién:** Munin → Bifröst
- **Dónde:** conexión `bf_munin` al revés
- **Pantallas:** `encargo` → `muninResult`
- **Qué ocurre:** La decisión nombra src/payments/retryPolicy.js, así que munin-memory la marca «por verificar».
- **Fuente:** skills/munin-memory/SKILL.md · Recall, paso 4

##### 3. Bifröst delega en Hugin para comprobarla
- **Quién:** Bifröst → Hugin
- **Dónde:** conexión `bf_hugin`
- **Pantallas:** `encargo` → `huginVerify`
- **Qué ocurre:** El encargo incluye la afirmación y el archivo que nombra Munin, para contrastarlos con el código actual. Hugin no habló con Munin: Bifröst le pasa lo necesario.

##### 4. Hugin devuelve la comprobación
- **Quién:** Hugin → Bifröst
- **Dónde:** conexión `bf_hugin` al revés
- **Pantallas:** `encargo` → `huginVerified`
- **Qué ocurre:** Lee el archivo y compara. Aquí coincide; si no coincidiera, Bifröst lo diría y el humano sabría que la memoria está desfasada.

##### 5. Bifröst entrega con la decisión verificada
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-memoria` → `delivery`
- **Qué ocurre:** La respuesta es la misma que en el camino paralelo; cambia el orden y el coste en tiempo, no el resultado.

#### hugin-graphify sin grafo (`sin-grafo`) · tras el paso 3

##### 1. Bifröst delega en hugin-graphify
- **Quién:** Bifröst → Hugin
- **Dónde:** conexión `bf_hugin`
- **Pantallas:** `encargo` → `graphBrief`
- **Qué ocurre:** Con HUGIN_BACKEND=graphify, Bifröst carga hugin-graphify en lugar de hugin. El encargo no trae la línea «Construir grafo: sí».
- **Fuente:** bifrost/CLAUDE.md · Exploración

##### 2. Hugin-graphify explora sin grafo y devuelve la pregunta
- **Quién:** Hugin → Bifröst
- **Dónde:** conexión `bf_hugin` al revés
- **Pantallas:** `encargo` → `graphNo`
- **Qué ocurre:** No hay graphify-out/graph.json y no tiene autorización: no construye nada. Explora leyendo código, devuelve el brief y, aparte, la pregunta «¿Lo construyo?» con sus opciones.
- **Qué viaja:**
  ```
  No hay grafo de graphify en este repo. ¿Lo construyo?
  - Construir el grafo ahora (graphify extract . --code-only: local, sin LLM ni coste)
  - Seguir sin grafo
  Si sí: delegar de nuevo con el encargo original más la línea "Construir grafo: sí"
  ```
- **Fuente:** skills/hugin-graphify/SKILL.md · Execution Steps, paso 3

##### 3. Bifröst te hace la pregunta
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-memoria` → `graphAsk`
- **Qué ocurre:** El subagente no puede preguntarte: lo hace Bifröst con AskUserQuestion. Con un «Seguir sin grafo», se queda con el brief ya devuelto y no vuelve a delegar.
- **Fuente:** bifrost/CLAUDE.md · Exploración

##### 4. Con tu sí, Bifröst vuelve a delegar
- **Quién:** Bifröst → Hugin
- **Dónde:** conexión `bf_hugin`
- **Pantallas:** `chat-memoria` → `graphYes` · `encargo` → `graphBrief2`
- **Qué ocurre:** Re-delega con el encargo original más la línea «Construir grafo: sí». Esa autorización vale solo para esa invocación.
- **Qué viaja:**
  ```
  Construir grafo: sí
  ```
- **Fuente:** bifrost/CLAUDE.md · Exploración

##### 5. Hugin-graphify construye el grafo y consulta
- **Quién:** Hugin → Bifröst
- **Dónde:** conexión `bf_hugin` al revés
- **Pantallas:** `encargo` → `graphDone`
- **Qué ocurre:** Ejecuta graphify extract . --code-only, añade graphify-out/ al .gitignore si es un repo git, consulta el grafo y confirma leyendo el código. El brief lleva la línea Fuente (grafo, código o mixto).
- **Fuente:** skills/hugin-graphify/SKILL.md · Hard Rules y Execution Steps

### Bajo el escenario

#### Puntos clave
- **[Clave] Modelo en estrella:** Mira el diagrama: no hay línea entre Hugin y Munin. Todo pasa por Bifröst, que es quien tiene la conversación completa.
- **[Clave] Subagentes sin conversación:** Reciben un encargo completo y no pueden preguntarte. Si algo bloquea, devuelven la pregunta a Bifröst, que la hace con AskUserQuestion.
- **[Riesgo] Una memoria puede estar desfasada:** Por eso lo que nombra un archivo o una función se marca «por verificar» y se contrasta con el código actual.

Además, bajo cada escenario aparecen las secciones de la vista (criterio plan mode u OpenSpec y tabla de intención a especialista), descritas en `PROJECT.md`.

---

## Abierto [?]

La misma lista que el mockup, «Abierto en este escenario».

1. ¿Debe Bifröst lanzar Hugin y Munin en paralelo por defecto cuando las preguntas son independientes? Hoy solo está escrito «Hugin y/o Munin» y que el trabajo en paralelo exige no tocar los mismos archivos; paralelo o secuencia es criterio de Bifröst.

## Acordado [A]

- La skill de cada especialista se elige por backend (HUGIN_BACKEND, MUNIN_BACKEND). [V]
- hugin-graphify no construye el grafo sin la línea «Construir grafo: sí», que solo vale para una invocación. [V]

## Glosario

Sin términos propios de este escenario: todos están en el glosario de `PROJECT.md`.

## Siguiente paso

1. Decidir si el paralelo por defecto merece escribirse como regla en bifrost/CLAUDE.md (ver «Open»).
