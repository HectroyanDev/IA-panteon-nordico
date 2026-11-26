# Design

## Context

El código del protocolo anterior ya está escrito y sin commit (ver proposal.md - Impact). Toca varias skills, el módulo de Vár y un script, y arrastra una restricción de orden de archivo. Este documento fija qué se conserva del código y por qué.

## Decisions

### D1. `tasks.md` lo escribe Skuld; sin `plan.json`
Sin `deps` no queda nada en `plan.json` que `tasks.md` no pueda llevar, y generar un archivo desde otro solo añade un paso y una desincronización posible. Formato de cada tarea: `- [ ] N.M T-n <título>. Verificación: <cómo>. Cubre: <capability>/REQ-NNN, …` (sin `Depende de`). Alternativa descartada: conservar `plan.json` sin `deps`.

### D2. `scripts/protocol.ts` queda con `ids` y `check`
`ids` (con `--next`) numera y detecta duplicados. `check <change>` comprueba `T-n` únicos en `tasks.md`, que cada `Cubre` exista entre los requisitos del change y que cada requisito ADDED o MODIFIED esté cubierto. Salen `tasks`, la validación de `validation.json` y el grafo. `reqs` se queda solo si algo lo usa tras el recorte.

### D3. Vár conserva `ref` y `drift.json`; pierde el orden
El juez recibe las tareas leídas de `tasks.md` (`T-n`, casilla, título) o, sin `T-n`, los requisitos del change. Desaparecen el origen `orden` y las marcas de partida. `drift.json` mantiene `schema_version: 1`.

### D4. Numeración del nuevo delta
`pantheon-handoff-contracts` no está archivada, así que sus requisitos se renumeran desde `REQ-001`. La regla de no reutilizar números rige desde que una capability llega a `openspec/specs/`.

### D5. La migración RENAMED se queda en este change
Está hecha y validada (simulación de archivo en copia). Sacarla a otro change es posible pero no reduce trabajo; queda fuera del tope de ~150 líneas porque son deltas mecánicos.

## Risks / Trade-offs

- [El MODIFIED "Configuración persistida" de `add-var-drift-watcher` no lleva ID] → archivar `add-var-drift-watcher` antes que este change; si no, renombrar antes ese título a `REQ-006 Configuración persistida`.
- [Las historias pierden detalle frente a 20 requisitos] → el detalle de implementación va en `tasks.md`; los criterios de aceptación cubren lo observable.
