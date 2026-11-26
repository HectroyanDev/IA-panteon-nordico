# Decisiones

## DEC-001 Conservar los IDs en las specs de add-var-drift-watcher

- **Fecha:** 2026-11-24
- **Decisión:** las ediciones sin commit que ponen `REQ-NNN` en los títulos de las specs de `add-var-drift-watcher` se conservan. Ese change no se pasa a historias y sigue con su formato.
- **Porqué:** mantiene los IDs consistentes y `protocol.ts ids` pasa; "no tocar" significaba no reescribirlo en historias.
- **Afecta:** pantheon-handoff-contracts/REQ-003.

## DEC-002 La migración RENAMED se queda en este change

- **Fecha:** 2026-11-24
- **Decisión:** los deltas RENAMED (204 líneas) se quedan aquí aunque el change pase de la guía de ~150 líneas.
- **Porqué:** son cambios mecánicos ya validados; el tope es una guía para el contenido que el humano revisa.
- **Afecta:** pantheon-handoff-contracts/REQ-001, REQ-003.
