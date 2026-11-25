# Spec Delta

## Purpose

Cerrar un change OpenSpec sin lanzar cada fase a mano: tras implementar, Bifröst valida con Heimdall y, si el resultado está limpio, Hela archiva sola.

## ADDED Requirements

### Requirement: REQ-001 Cierre encadenado
Como humano que aprueba historias quiero que validar y archivar ocurran solos cuando la implementación está limpia, para no lanzar cada fase a mano. Tras Brokkr, Bifröst MUST lanzar a Heimdall sin preguntar; Hela MUST archivar sin preguntar solo si el resultado es limpio: sin CRITICAL ni WARNING y sin tareas pendientes. El commit MUST seguir pidiendo permiso explícito.

#### Scenario: Validación tras implementar
- **WHEN** Brokkr devuelve su resumen de un change OpenSpec sin preguntas pendientes
- **THEN** Bifröst delega en Heimdall en el mismo turno, sin preguntar al humano

#### Scenario: Resultado limpio
- **WHEN** Heimdall no informa de ningún CRITICAL ni WARNING y todas las casillas de `tasks.md` están marcadas
- **THEN** Bifröst carga a Hela, que archiva sin `AskUserQuestion` e informa de la carpeta archivada y las specs sincronizadas, sin hacer commit

#### Scenario: Avisos o tareas pendientes
- **WHEN** Heimdall informa de algún WARNING o en `tasks.md` queda alguna casilla sin marcar, incluidas las de pruebas manuales
- **THEN** Hela pregunta con `AskUserQuestion` (`Archivar` / `Mantener abierto`) y solo archiva con `Archivar`

#### Scenario: CRITICAL
- **WHEN** Heimdall informa de algún CRITICAL
- **THEN** Bifröst no carga a Hela, presenta los hallazgos y ofrece volver a delegar en Brokkr

#### Scenario: Otro change debe archivarse antes
- **WHEN** el proposal, el design o el `decisions.md` del change dicen que otro change debe archivarse antes y ese otro sigue en `openspec/changes/`
- **THEN** Hela no archiva y avisa de qué change falta por archivar
