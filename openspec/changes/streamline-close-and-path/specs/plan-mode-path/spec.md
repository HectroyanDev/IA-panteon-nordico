# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-001 Elección entre plan mode y OpenSpec
Como humano quiero que Bifröst elija el camino ligero salvo que el cambio cree una capacidad nueva, para que el trabajo pequeño no pague el coste de OpenSpec. Ante un cambio no mecánico, Bifröst SHALL elegir plan mode salvo que el cambio cree una capacidad que no existe o modifique comportamiento descrito por una spec de `openspec/specs/`; en esos casos, OpenSpec. Las tareas mecánicas MUST seguir resolviéndose inline.

#### Scenario: Ajuste sobre algo existente
- **WHEN** el humano pide un ajuste, un refactor, un arreglo o un cambio de comportamiento sobre algo existente que ninguna spec de `openspec/specs/` describe
- **THEN** Bifröst elige plan mode y no invoca a Skuld

#### Scenario: Capacidad nueva
- **WHEN** el cambio crea una capacidad que hoy no existe
- **THEN** Bifröst sigue el camino OpenSpec

#### Scenario: Comportamiento con spec
- **WHEN** un cambio menor modifica comportamiento que describe una spec de `openspec/specs/`
- **THEN** Bifröst sigue el camino OpenSpec, para que la spec no quede desfasada

#### Scenario: Camino anunciado
- **WHEN** Bifröst elige un camino
- **THEN** dice en una línea cuál y por qué, sin preguntar al humano

#### Scenario: Duda real
- **WHEN** Bifröst no puede decidir si el cambio crea una capacidad o toca comportamiento con spec
- **THEN** pregunta qué camino seguir con `AskUserQuestion` antes de entrar en plan mode o delegar en Skuld
