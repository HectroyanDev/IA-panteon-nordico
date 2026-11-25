# Spec Delta

## ADDED Requirements

### Requirement: REQ-001 Specs como historias de usuario
Como humano que aprueba changes quiero que Skuld escriba las specs como historias cortas para revisar y aprobar el trabajo de un vistazo. Skuld MUST escribir cada requisito como una historia con sus criterios de aceptación y mantener cada change pequeño.

#### Scenario: Historia con criterios
- **WHEN** Skuld escribe un requisito en un delta
- **THEN** el título es `### Requirement: REQ-NNN <nombre>`, el cuerpo empieza por "Como <rol> quiero <capacidad> para <beneficio>" y lleva entre 3 y 5 escenarios, que son sus criterios de aceptación

#### Scenario: Change dentro de la guía
- **WHEN** Skuld planifica historias confirmadas
- **THEN** el change tiene entre 1 y 3 historias y sus artefactos rondan las 150 líneas, como guía y sin comprobación automática

#### Scenario: Trabajo que no cabe
- **WHEN** las historias confirmadas son más de 3 o los artefactos irían muy por encima de ~150 líneas
- **THEN** Skuld devuelve a Bifröst una propuesta para partir el trabajo en varios changes, sin escribir uno solo más grande

#### Scenario: design.md solo si hace falta
- **WHEN** el change no es transversal, no añade dependencias, no tiene complejidad de seguridad, rendimiento o migración ni ambigüedad técnica
- **THEN** Skuld no escribe `design.md`; si alguno de esos criterios aplica, lo escribe breve

#### Scenario: Changes en formato anterior
- **WHEN** hay changes abiertos o archivados escritos con el formato anterior
- **THEN** Skuld no los reescribe

### Requirement: REQ-002 Una sola confirmación de las historias
Como humano quiero confirmar una sola vez las historias que redacta Odín para pasar de requisitos a implementación sin paradas repetidas. En el camino OpenSpec, Odín MUST redactar las historias y el `Sí, confirmo` del humano MUST bastar para planificar e implementar.

#### Scenario: Odín redacta historias
- **WHEN** Odín ha reunido los requisitos de un trabajo que va por OpenSpec
- **THEN** presenta 1-3 historias con sus criterios en lugar del restate de seis campos y pide `Sí, confirmo` o `Corregir` con `AskUserQuestion`

#### Scenario: Corrección
- **WHEN** el humano responde algo distinto de `Sí, confirmo`
- **THEN** Odín ajusta las historias y vuelve a pedir confirmación

#### Scenario: Skuld sin otra parada
- **WHEN** Bifröst delega en Skuld historias confirmadas
- **THEN** Skuld las convierte en artefactos con el mismo contenido y no pide revisar la propuesta

#### Scenario: Bloqueo de Skuld
- **WHEN** Skuld no puede seguir (falta el nombre del change, un dato del código, hay artefactos en conflicto o el trabajo hay que partirlo)
- **THEN** devuelve la pregunta con opciones a Bifröst, que la lanza al humano

#### Scenario: Encadenado
- **WHEN** Skuld devuelve los artefactos sin bloqueo
- **THEN** Bifröst puede delegar en Brokkr sin pedir otra confirmación

### Requirement: REQ-003 IDs de traspaso sin grafo
Como mantenedor del panteón quiero conservar solo los IDs que Vár y Heimdall citan para que el protocolo de traspaso tenga menos piezas. Cada requisito MUST llevar `REQ-NNN` y cada tarea `T-n`; el plan de tareas MUST ser un `tasks.md` sin `plan.json` ni dependencias.

#### Scenario: IDs estables
- **WHEN** Skuld añade un requisito a una capability
- **THEN** el título lleva el número que da `bun scripts/protocol.ts ids --next <capability>`, renombrarlo conserva el número y `bun scripts/protocol.ts ids` falla si un requisito no tiene ID o lo repite

#### Scenario: Tareas en tasks.md
- **WHEN** Skuld escribe el plan de tareas
- **THEN** escribe `tasks.md` con un `T-n`, una verificación y los requisitos que cubre por tarea, y `bun scripts/protocol.ts check <change>` falla si un `T-n` se repite, una tarea cita un requisito ajeno al change o un requisito ADDED o MODIFIED queda sin tarea

#### Scenario: Orden libre
- **WHEN** Brokkr implementa un change
- **THEN** sigue el orden de `tasks.md` y Vár no trata como desvío marcar una tarea antes que otra

#### Scenario: Vár cita lo afectado
- **WHEN** Vár emite un veredicto
- **THEN** el veredicto lleva `ref` con el `T-n`, el `<capability>/REQ-NNN` o el `STEP-N` afectado y, en el camino OpenSpec, se añade a `drift.json` del change

#### Scenario: Heimdall por historia
- **WHEN** Heimdall valida un change OpenSpec
- **THEN** informa de cada historia frente a sus criterios con evidencia, sin `validation.json` obligatorio ni CRITICAL por trazabilidad
