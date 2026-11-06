# munin-memory-backends Specification

## Purpose
Dar al panteón memoria persistente con dos backends intercambiables, Mimisbrunnr o la memoria nativa de Claude Code, y que el resto de especialistas no dependa de cuál esté activo.

## Requirements

### Requirement: Munin sobre Mimisbrunnr
El plugin SHALL incluir la skill `nordic-pantheon:munin-mimir`, que recupera y guarda memoria solo con las herramientas del MCP `mimisbrunnr` (`mimir_*`), con el mismo comportamiento que la skill `munin` actual.

#### Scenario: Recuperar con Mimir
- **WHEN** se invoca `munin-mimir` para recordar trabajo pasado de un proyecto
- **THEN** usa `mimir_context` y, si no basta, `mimir_search` y `mimir_get`, y devuelve lo encontrado o dice que no hay nada

### Requirement: Munin sobre la memoria de Claude Code
El plugin SHALL incluir la skill `nordic-pantheon:munin-memory`, que recupera y guarda memoria como archivos markdown con frontmatter (`name`, `description`, `metadata.type`) indexados en un `MEMORY.md`, sin usar herramientas `mimir_*`.

#### Scenario: No usa Mimir
- **WHEN** se invoca `munin-memory`
- **THEN** no llama a ninguna herramienta `mimir_*` aunque estén disponibles

### Requirement: Ámbitos de la memoria nativa
`munin-memory` SHALL manejar dos ámbitos: proyecto, en `~/.claude/projects/<proyecto>/memory/` (la memoria nativa de Claude Code para el directorio de trabajo), y global, en `~/.claude/nordic-pantheon/memory/`. Al recordar MUST buscar en ambos; al guardar MUST elegir proyecto salvo que el aprendizaje valga para cualquier proyecto.

#### Scenario: Recordar en ambos ámbitos
- **WHEN** se pide recordar una decisión y hay coincidencias en la memoria del proyecto y en la global
- **THEN** Munin devuelve ambas indicando de qué ámbito viene cada una

#### Scenario: Guardar una preferencia general
- **WHEN** se guarda una preferencia del humano que aplica a todos los proyectos
- **THEN** se escribe en `~/.claude/nordic-pantheon/memory/` y se añade su línea al `MEMORY.md` de ese directorio

#### Scenario: Guardar una decisión del proyecto
- **WHEN** se guarda una decisión propia del repo actual
- **THEN** se escribe en la memoria del proyecto y se añade su línea al `MEMORY.md` del proyecto

### Requirement: Sin duplicados ni recuerdos inventados
Ambas skills de Munin SHALL actualizar una entrada existente del mismo tema en lugar de crear otra, y MUST decir que no hay nada cuando la búsqueda no encuentra resultados, sin inventar contenido.

#### Scenario: Tema existente
- **WHEN** `munin-memory` guarda un aprendizaje cuyo tema ya tiene un archivo
- **THEN** actualiza ese archivo y no añade una segunda línea al `MEMORY.md`

#### Scenario: Memoria vacía
- **WHEN** se pide recordar algo y ningún ámbito tiene coincidencias
- **THEN** Munin responde que no hay recuerdos sobre eso

### Requirement: Selección del backend activo
Bifröst SHALL delegar la memoria en la skill que indique `MUNIN_BACKEND` en la config del panteón (`mimir` → `munin-mimir`, `memory` → `munin-memory`). Sin config o sin esa clave, MUST usar `munin-mimir` si las herramientas `mimir_*` están disponibles y `munin-memory` si no.

#### Scenario: Backend configurado
- **WHEN** la config indica `MUNIN_BACKEND=memory` y Bifröst necesita contexto histórico
- **THEN** carga `nordic-pantheon:munin-memory`

#### Scenario: Sin config y sin Mimir
- **WHEN** no existe la config y no hay herramientas `mimir_*` en la sesión
- **THEN** Bifröst carga `nordic-pantheon:munin-memory`

### Requirement: Especialistas agnósticos del backend
Los especialistas distintos de Munin y `bifrost/CLAUDE.md` SHALL referirse a la memoria como "Munin" sin nombrar herramientas `mimir_*` ni un backend concreto.

#### Scenario: Revisión de referencias
- **WHEN** se buscan `mimir_` en `skills/` excluyendo `skills/munin-mimir/`, y en `bifrost/CLAUDE.md`
- **THEN** no hay coincidencias
