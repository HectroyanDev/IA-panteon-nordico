# Panteón — Flujos: Camino OpenSpec

> Borrador para discusión · 2026-11-04. Dice lo mismo que el mockup: vista «Flujos», escenario «Camino OpenSpec» (`#flujo-openspec`, 18 pasos, 3 ramas). Si uno cambia, el otro debe cambiar también.
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

1. **Comportamiento nuevo, camino OpenSpec.** Si el cambio añade o modifica comportamiento que merezca spec, se pasa por Odín, Skuld, Brokkr, Heimdall y Hela, cada uno con su comando /opsx:*. [V]
2. **Odín confirma antes de planificar.** Solo «Sí, confirmo» cuenta como sí; Skuld no propone sin requisitos confirmados ni sin nombre de change. [V]
3. **Una parada por fase (anti-waterfall).** Cada fase acaba en una entrega de Bifröst con el siguiente paso posible; ese paso no corre sin un sí. [V]
4. **Archivar exige cerrar bien.** Hela no archiva sin verify superado o un waive explícito. [V]

Los nombres de peticiones, rutas, funciones y changes son ejemplos inventados; el comportamiento sale de las skills, `bifrost/CLAUDE.md`, el README y `hooks/var.tsx`.

---

## Mockup

### Ficha

| Campo | Valor |
| --- | --- |
| id | `flujo-openspec` |
| Vista | Flujos (`flujo`) |
| Título | Camino OpenSpec |
| Subtítulo | Comportamiento nuevo: requisitos, planificación, implementación, validación y archivo, con una parada entre fases |
| Código de ejemplo | `exportar-pedidos-csv` |
| Documento | — |

### Piezas del diagrama

Zonas: `channel` Humano · `server` Orquestador · `venue` Hilo principal · `staff` Subagentes · `external` Segundo plano / externo.

| id | Nombre | Subtítulo | Zona | Posición |
| --- | --- | --- | --- | --- |
| `human` | Humano | Desarrollador | channel | 150,320 |
| `bifrost` | Bifröst | Orquestador | server | 560,320 |
| `odin` | Odín | Requisitos | venue | 330,100 |
| `skuld` | Skuld | Planifica el change | staff | 800,100 |
| `brokkr` | Brokkr | Implementa | staff | 1090,220 |
| `heimdall` | Heimdall | Valida contra la spec | staff | 1090,430 |
| `hela` | Hela | Archiva el change | venue | 800,560 |

**Grupos:** ninguno (el color de cada caja marca su zona).

### Conexiones

| id | De | A | Etiqueta | Tipo |
| --- | --- | --- | --- | --- |
| `bf_h` | `bifrost` | `human` | conversación | normal |
| `bf_odin` | `bifrost` | `odin` | encargo | normal |
| `odin_h` | `odin` | `human` | preguntas | normal |
| `bf_skuld` | `bifrost` | `skuld` | /opsx:propose | normal |
| `bf_brokkr` | `bifrost` | `brokkr` | /opsx:apply | normal |
| `bf_heimdall` | `bifrost` | `heimdall` | /opsx:verify | normal |
| `bf_hela` | `bifrost` | `hela` | /opsx:archive | normal |
| `hela_h` | `hela` | `human` | confirmación | normal |

Una respuesta usa la misma conexión «al revés».

### Aparatos

| id | Tipo | Nombre | Piezas que representa |
| --- | --- | --- | --- |
| `chat-spec` | desktop | Conversación en Claude Code | `human` |
| `carpeta-change` | desktop | Carpeta del change | `skuld`, `hela` |

### Pantallas

**Al empezar:** todo apagado.

#### `chat-spec` · `request`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «Quiero que los usuarios exporten sus pedidos a CSV»

#### `chat-spec` · `noOpenspec`
- Arriba
- Texto pequeño: «Bifröst: este repo no tiene openspec/»
- Código: `openspec init --tools none`
- Texto pequeño (gris): «Las skills ya son globales; --tools claude las duplicaría.»

#### `chat-spec` · `question`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Odín: ¿quién lo usará?»
- Opciones de lista: «Clientes con cuenta» (seleccionada) · «Soporte interno»
- Texto pequeño (gris): «Por qué: cambia los permisos del endpoint.»

#### `chat-spec` · `answered`
- Arriba
- Texto pequeño (gris): «Tus respuestas»
- Filas: Usuario = clientes con cuenta · Fuera = PDF, facturas

#### `chat-spec` · `restate`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Odín: botón «Exportar CSV» en «Mis pedidos»; solo pedidos propios; sin PDF ni facturas.»
- Opciones de botón: «Sí, confirmo» (seleccionada) · «Corregir»

#### `chat-spec` · `confirmed`
- Éxito ✓
- Icono ✓
- Título: «Requisitos confirmados»
- Texto pequeño (gris): «Sí, confirmo»

#### `chat-spec` · `working`
- Spinner
- Texto pequeño: «Skuld planifica el change»

#### `chat-spec` · `deliveryPropose`
- Arriba
- Filas: Qué se hizo = change planificado · Qué queda = implementar, validar
- Opciones de botón: «Implementar (Brokkr)» (seleccionada) · «Revisar artefactos»

#### `chat-spec` · `implementing`
- Spinner
- Texto pequeño: «Brokkr: /opsx:apply»

#### `chat-spec` · `deliveryApply`
- Arriba
- Filas: Qué se hizo = 5 de 5 tareas · Qué queda = validar contra la spec
- Opciones de botón: «Validar (Heimdall)» (seleccionada) · «Revisar el código»

#### `chat-spec` · `verifying`
- Spinner
- Texto pequeño: «Heimdall: /opsx:verify»

#### `chat-spec` · `deliveryVerify`
- Arriba
- Filas: Qué se hizo = verify superado · Qué queda = archivar el change
- Opciones de botón: «Archivar (Hela)» (seleccionada) · «Dejarlo abierto»

#### `chat-spec` · `archiveAsk`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Hela: ¿archivo exportar-pedidos-csv?»
- Opciones de botón: «Archivar» (seleccionada) · «Mantener abierto»

#### `chat-spec` · `archived`
- Éxito ✓
- Icono ✓
- Título: «Change archivado»
- Texto pequeño (gris): «Specs sincronizadas»

#### `chat-spec` · `noName`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Bifröst: ¿cómo se llama el change?»
- Opciones de lista: «exportar-pedidos-csv» (seleccionada) · «export-orders-csv» · «pedidos-exportacion»

#### `chat-spec` · `criticalDelivery`
- Arriba
- Error
- Título: «Heimdall: 1 CRITICAL»
- Texto pequeño: «El endpoint no limita a pedidos propios»
- Opciones de botón: «Que Brokkr lo corrija» (seleccionada) · «Waive: archivar igual»

#### `carpeta-change` · `artifacts`
- Panel clave-valor «openspec/changes/exportar-pedidos-csv/»: proposal.md = ok (resaltado) · specs/orders-export/spec.md = ok (resaltado) · design.md = ok (resaltado) · tasks.md = 0/5 (resaltado)

#### `carpeta-change` · `done`
- Panel clave-valor «openspec/changes/exportar-pedidos-csv/»: tasks.md = 5/5 (resaltado) · Código = 4 archivos cambiados

#### `carpeta-change` · `verified`
- Panel clave-valor «openspec/changes/exportar-pedidos-csv/»: verify = sin CRITICAL (resaltado) · tasks.md = 5/5

#### `carpeta-change` · `critical`
- Error
- Panel clave-valor «openspec/changes/exportar-pedidos-csv/»: verify = CRITICAL: 1 (resaltado) · Archivo = no se archiva

#### `carpeta-change` · `archived`
- Panel clave-valor «openspec/changes/archive/»: Carpeta = 2026-11-04-exportar-pedidos-csv (resaltado) · specs = 1 sincronizada

### Pasos

#### 1. Pides una función nueva
- **Quién:** Tú, en la conversación
- **Dónde:** pieza `human`
- **Pantallas:** `chat-spec` → `request`
- **Qué ocurre:** La petición añade comportamiento (un botón y un fichero descargable). Eso es lo que decide el camino.
- **Qué viaja:**
  ```
  Tú: Quiero que los usuarios exporten sus pedidos a CSV
  ```

#### 2. Bifröst clasifica y carga a Odín
- **Quién:** Bifröst → Odín
- **Dónde:** conexión `bf_odin`
- **Qué ocurre:** ¿Añade o modifica comportamiento que merezca spec? Sí, así que el camino es OpenSpec. Los requisitos están incompletos, por eso lo primero es Odín, que corre en el hilo principal.
- **Qué viaja:**
  ```
  Clasificación: trabajo no trivial, requisitos incompletos
  ¿Añade o modifica comportamiento que merezca spec? Sí
  → OpenSpec; primero Odín (elicita y para)
  ```
- **Fuente:** bifrost/CLAUDE.md · Procedimiento y Tabla de decisión

#### 3. Odín pregunta lo que falta
- **Quién:** Odín → tú
- **Dónde:** conexión `odin_h`
- **Pantallas:** `chat-spec` → `question`
- **Qué ocurre:** Pregunta quién lo pide, por qué ahora, qué significa «hecho», restricciones y qué queda fuera. Las incógnitas independientes comparten una llamada de AskUserQuestion; cada pregunta lleva su porqué. Después de preguntar, para.
- **Qué viaja:**
  ```
  AskUserQuestion
  1. ¿Quién lo usará?  [Clientes con cuenta] [Soporte interno]
     Por qué: cambia los permisos del endpoint.
  2. ¿Qué cuenta como hecho?  [CSV abre en Excel con 4 columnas] [Otro formato]
  3. ¿Qué queda fuera?  [PDF y facturas] [Pedidos de otros usuarios]
  ```
- **Fuente:** skills/odin/SKILL.md · Execution Steps

#### 4. Respondes
- **Quién:** Tú → Odín
- **Dónde:** conexión `odin_h` al revés
- **Pantallas:** `chat-spec` → `answered`
- **Qué ocurre:** Una respuesta como «lo que veas» o el silencio no es confirmación: Odín ofrecería dos opciones concretas.

#### 5. Odín resume los requisitos y pide confirmación
- **Quién:** Odín → tú
- **Dónde:** conexión `odin_h`
- **Pantallas:** `chat-spec` → `restate`
- **Qué ocurre:** Hace un restate con Resultado, Usuario, Por qué ahora, Éxito, Restricción y Fuera de alcance, y pregunta «Sí, confirmo» o «Corregir». Solo «Sí, confirmo» cuenta como sí.
- **Qué viaja:**
  ```
  Resultado: botón «Exportar CSV» en «Mis pedidos» que descarga un CSV
  Usuario: clientes con cuenta
  Por qué ahora: hoy lo piden a soporte
  Éxito: el CSV abre en Excel con número, fecha, total y estado
  Restricción: solo pedidos propios; sin dependencias nuevas
  Fuera de alcance: PDF, facturas, pedidos de otros usuarios
  AskUserQuestion: ¿Confirmas el restate?  [Sí, confirmo] [Corregir]
  ```
- **Fuente:** skills/odin/references/questioning.md

#### 6. Confirmas y Odín entrega a Bifröst
- **Quién:** Tú → Odín → Bifröst
- **Dónde:** conexión `bf_odin` al revés
- **Pantallas:** `chat-spec` → `confirmed`
- **Qué ocurre:** Con «Sí, confirmo» Odín devuelve a Bifröst el restate confirmado. Odín no elige ni lanza la siguiente fase: eso lo decide Bifröst.
- **Fuente:** skills/odin/SKILL.md · Execution Steps, paso 5

#### 7. Bifröst delega la planificación en Skuld
- **Quién:** Bifröst → Skuld
- **Dónde:** conexión `bf_skuld`
- **Qué ocurre:** Con requisitos confirmados y un change con nombre, Skuld lanza /opsx:propose. Es un subagente: el encargo lleva el restate íntegro, el nombre y las decisiones tomadas.
- **Qué viaja:**
  ```
  Encargo a Skuld
  /opsx:propose exportar-pedidos-csv
  Requisitos confirmados: (restate íntegro)
  Rutas: repo actual, carpeta openspec/
  ```
- **Ojo:** Sin nombre de change no se planifica: mira la rama «Sin nombre de change».
- **Fuente:** skills/skuld/SKILL.md · Decision Gates

#### 8. Skuld crea los artefactos y devuelve el resumen
- **Quién:** Skuld → Bifröst
- **Dónde:** conexión `bf_skuld` al revés
- **Pantallas:** `chat-spec` → `working` · `carpeta-change` → `artifacts`
- **Qué ocurre:** Genera proposal, specs, design y tasks en openspec/changes/exportar-pedidos-csv/ y devuelve rutas, un resumen y si Brokkr es el siguiente paso lógico. No implementa, no valida, no archiva.
- **Qué viaja:**
  ```
  openspec/changes/exportar-pedidos-csv/
    proposal.md
    specs/orders-export/spec.md
    design.md
    tasks.md   (0/5)
  Listo para /opsx:apply: sí
  ```
- **Fuente:** skills/skuld/SKILL.md · Output Contract

#### 9. Parada: Bifröst entrega y propone implementar
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-spec` → `deliveryPropose`
- **Qué ocurre:** Aquí termina la fase. Bifröst cuenta qué se hizo, qué queda y el siguiente paso posible (Brokkr), y espera tu sí. No lo ejecuta por su cuenta: eso es el anti-waterfall.
- **Qué viaja:**
  ```
  Qué se hizo: change exportar-pedidos-csv planificado (proposal, specs, design, tasks 0/5)
  Qué queda: implementar, validar, archivar
  Siguiente paso posible: Brokkr (/opsx:apply)  → espera tu sí
  ```
- **Ojo:** Está prohibido encadenar Odín, propose, apply, verify y archive solo porque sí.
- **Fuente:** bifrost/CLAUDE.md · Anti-waterfall

#### 10. Con tu sí, Bifröst delega en Brokkr
- **Quién:** Bifröst → Brokkr
- **Dónde:** conexión `bf_brokkr`
- **Pantallas:** `chat-spec` → `implementing`
- **Qué ocurre:** Brokkr lee tasks.md, design.md y las specs, y lanza /opsx:apply. Al implementarse un change, Vár empieza a vigilar el tasks.md por sí sola.
- **Qué viaja:**
  ```
  Encargo a Brokkr
  /opsx:apply exportar-pedidos-csv
  Lee: tasks.md, design.md, specs/orders-export/spec.md
  ```
- **Clave:** Vár no aparece como pieza en este escenario porque actúa sola; el escenario 1 la muestra con su panel.
- **Fuente:** README.md · Vár; skills/brokkr/SKILL.md

#### 11. Brokkr implementa, marca las tareas y devuelve el resumen
- **Quién:** Brokkr → Bifröst
- **Dónde:** conexión `bf_brokkr` al revés
- **Pantallas:** `carpeta-change` → `done`
- **Qué ocurre:** Marca cada tarea al completarla y devuelve tareas hechas frente a pendientes, archivos cambiados y bloqueos. No re-especifica: si le falta una decisión, para y devuelve la pregunta.
- **Qué viaja:**
  ```
  Tareas: 5/5 hechas
  Archivos: src/api/orders/exportCsv.js, src/lib/csv/ordersSerializer.js,
            src/pages/MyOrders.jsx, src/api/orders/exportCsv.test.js
  Bloqueos: ninguno
  Sugerencia: validar con Heimdall
  ```
- **Fuente:** skills/brokkr/SKILL.md · Output Contract

#### 12. Parada: Bifröst entrega y propone validar
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-spec` → `deliveryApply`
- **Qué ocurre:** Segunda parada. Cuenta qué cambió y propone a Heimdall. No lo lanza hasta que dices que sí.

#### 13. Con tu sí, Bifröst delega en Heimdall
- **Quién:** Bifröst → Heimdall
- **Dónde:** conexión `bf_heimdall`
- **Pantallas:** `chat-spec` → `verifying`
- **Qué ocurre:** Heimdall lanza /opsx:verify y compara la implementación con la spec, el design y las tasks. Al empezar Heimdall se cierra la vigilancia de Vár.
- **Qué viaja:**
  ```
  Encargo a Heimdall
  /opsx:verify exportar-pedidos-csv
  ```
- **Fuente:** skills/heimdall/SKILL.md; README.md · Vár

#### 14. Heimdall devuelve el informe: verify superado
- **Quién:** Heimdall → Bifröst
- **Dónde:** conexión `bf_heimdall` al revés
- **Pantallas:** `carpeta-change` → `verified`
- **Qué ocurre:** Informa de CRITICAL, WARNING y SUGGESTION, cada uno con su porqué. Si todo pasa, dice a Bifröst que ofrezca a Hela. No arregla nada.
- **Qué viaja:**
  ```
  Estado: pass
  CRITICAL: 0 · WARNING: 0 · SUGGESTION: 1
  Siguiente: Hela (/hela) si quieres cerrar el change
  ```
- **Fuente:** skills/heimdall/SKILL.md · Output Contract

#### 15. Parada: Bifröst entrega y ofrece archivar
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-spec` → `deliveryVerify`
- **Qué ocurre:** Tercera parada. Ofrece a Hela para cerrar el change y espera tu sí.

#### 16. Con tu sí, Bifröst carga a Hela
- **Quién:** Bifröst → Hela
- **Dónde:** conexión `bf_hela`
- **Qué ocurre:** Hela corre en el hilo principal porque pregunta. Comprueba que el change está completo: verify superado o un waive explícito tuyo.
- **Fuente:** skills/hela/SKILL.md · Hard Rules

#### 17. Hela confirma contigo antes de archivar
- **Quién:** Hela → tú
- **Dónde:** conexión `hela_h`
- **Pantallas:** `chat-spec` → `archiveAsk`
- **Qué ocurre:** Si no has confirmado, pregunta con AskUserQuestion: Archivar o Mantener abierto. Si quieres mantenerlo abierto, no archiva.

#### 18. Hela archiva el change y sincroniza las specs
- **Quién:** Hela
- **Dónde:** pieza `hela`
- **Pantallas:** `chat-spec` → `archived` · `carpeta-change` → `archived`
- **Qué ocurre:** Con tu «Archivar», lanza /opsx:archive y entrega la ruta del archivo y el resumen de specs sincronizadas. Sugiere a Munin si hay aprendizajes que merezcan guardarse.
- **Qué viaja:**
  ```
  /opsx:archive exportar-pedidos-csv
  → openspec/changes/archive/2026-11-04-exportar-pedidos-csv/
  Specs sincronizadas: orders-export (nueva)
  ```
- **Fuente:** skills/hela/SKILL.md · Output Contract
- **Enlace:** [Detalle del camino en ONBOARDING.md](../../ONBOARDING.md#5-camino-openspec)

### ¿Y si…?

#### El repo no tiene openspec/ (`sin-openspec`) · tras el paso 2

##### 1. Bifröst sugiere inicializar OpenSpec
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-spec` → `noOpenspec`
- **Qué ocurre:** Cada repo necesita su carpeta openspec/. Si falta, Bifröst sugiere ejecutar en la raíz openspec init --tools none. No simula la skill ni crea la carpeta él mismo.
- **Qué viaja:**
  ```
  openspec init --tools none
  ```
- **Clave:** --tools claude duplicaría en el repo las skills que ya son globales.
- **Fuente:** bifrost/CLAUDE.md · OpenSpec en Claude Code

##### 2. Lo ejecutas tú y el camino sigue
- **Quién:** Tú
- **Dónde:** pieza `human`
- **Qué ocurre:** Ejecutas el comando en la raíz del repo y se retoma el camino en el paso 3 (Odín). El momento exacto en que Bifröst lo detecta es una interpretación.
- **Ojo:** Cuándo se detecta no está escrito en las fuentes.

#### Sin nombre de change (`sin-nombre`) · tras el paso 6

##### 1. Bifröst delega en Skuld sin nombre
- **Quién:** Bifröst → Skuld
- **Dónde:** conexión `bf_skuld`
- **Qué ocurre:** El encargo lleva los requisitos pero ningún nombre de change.
- **Fuente:** skills/skuld/SKILL.md · Decision Gates

##### 2. Skuld para y devuelve candidatos
- **Quién:** Skuld → Bifröst
- **Dónde:** conexión `bf_skuld` al revés
- **Qué ocurre:** No crea nada. Devuelve a Bifröst una pregunta con 2 o 3 nombres candidatos en kebab-case. Skuld no puede preguntarte: no tiene AskUserQuestion.
- **Qué viaja:**
  ```
  Falta el nombre del change. Candidatos:
  - exportar-pedidos-csv
  - export-orders-csv
  - pedidos-exportacion
  ```
- **Fuente:** skills/skuld/SKILL.md · Decision Gates

##### 3. Bifröst te pregunta el nombre
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-spec` → `noName`
- **Qué ocurre:** Lanza la pregunta con AskUserQuestion y espera. Con tu respuesta vuelve a delegar en Skuld y el camino sigue en el paso 7.
- **Fuente:** skills/_shared/communication.md · Contrato con los subagentes

#### Verify con CRITICAL (`verify-critical`) · tras el paso 13

##### 1. Heimdall informa de un CRITICAL
- **Quién:** Heimdall → Bifröst
- **Dónde:** conexión `bf_heimdall` al revés
- **Pantallas:** `chat-spec` → `criticalDelivery` · `carpeta-change` → `critical`
- **Qué ocurre:** La implementación no cumple un requisito de la spec: el endpoint no limita la exportación a los pedidos del usuario autenticado. Heimdall lo reporta con su porqué y no arregla nada.
- **Qué viaja:**
  ```
  Estado: fail
  CRITICAL: GET /api/orders/export.csv no filtra por usuario (spec: solo pedidos propios)
    Por qué: expone pedidos ajenos; se detecta probando con dos usuarios distintos
  ```
- **Fuente:** skills/heimdall/SKILL.md · Decision Gates

##### 2. Bifröst entrega: Brokkr corrige o hay un waive
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Qué ocurre:** Bifröst cuenta el hallazgo y propone el siguiente paso: volver a delegar en Brokkr con el informe, o que tú renuncies de forma explícita (waive). No archiva nada en este punto.
- **Fuente:** skills/hela/SKILL.md · Decision Gates; bifrost/CLAUDE.md · Tabla de decisión

##### 3. Hela no archiva sin verify superado o waive
- **Quién:** Hela → tú
- **Dónde:** conexión `hela_h`
- **Qué ocurre:** Si pides archivar igualmente, Hela exige tu waive explícito. Con un CRITICAL de verify, lo que corresponde es devolver a Brokkr.
- **Ojo:** Un waive es tuyo: Bifröst no lo da por supuesto.
- **Fuente:** skills/hela/SKILL.md · Hard Rules y Decision Gates

### Bajo el escenario

#### Puntos clave
- **[Clave] Anti-waterfall: una parada por fase:** Cada fase termina en una entrega de Bifröst con el siguiente paso posible. Ese paso no corre sin tu sí.
- **[Clave] Requisitos antes que plan:** Skuld no planifica sin requisitos confirmados por Odín y sin nombre de change.
- **[Clave] Cada fase es opcional:** Se hace la que el contexto exige. Una feature compleja es un menú: apply, verify, docs y git los eliges tú.
- **[Riesgo] Archivar exige verify o waive:** Con un CRITICAL abierto, Hela no archiva a menos que renuncies de forma explícita.

Además, bajo cada escenario aparecen las secciones de la vista (criterio plan mode u OpenSpec y tabla de intención a especialista), descritas en `PROJECT.md`.

---

## Abierto [?]

La misma lista que el mockup, «Abierto en este escenario».

1. ¿Cuándo detecta Bifröst que el repo no tiene openspec/? Las fuentes dicen que sugiere openspec init --tools none, no en qué momento lo comprueba.
2. ¿De dónde sale el nombre del change cuando el humano no lo da? Skuld devuelve candidatos si falta; el escenario supone que Bifröst lo deriva del restate.

## Acordado [A]

- Un repo sin openspec/ recibe la sugerencia openspec init --tools none, no --tools claude. [V]
- Sin nombre de change, Skuld devuelve candidatos en kebab-case y no crea nada. [V]
- Con CRITICAL, Bifröst puede volver a delegar en Brokkr. [V]

## Glosario

Sin términos propios de este escenario: todos están en el glosario de `PROJECT.md`.

## Siguiente paso

1. Validar con el equipo que las tres paradas intermedias resultan útiles y no pesadas.
