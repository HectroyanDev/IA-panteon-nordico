# Proposal

## Why

El estado real del trabajo del humano está repartido entre Jira (tickets asignados), GitHub y Bitbucket (sus PRs), y para saber qué está parado, qué espera revisión o qué ticket no cuadra con su PR tiene que abrir tres sitios y cruzarlos de memoria. El panteón no tiene ninguna vista persistente: todo lo que produce vive en la conversación. Midgard abre una familia nueva, las **escenas**: páginas temáticas que una tarea local mantiene al día en un artifact privado, siempre en la misma URL.

## What Changes

- Nuevo **patrón de escena** del panteón, documentado en `skills/_shared/scenes.md` y con una librería mínima compartida (`skills/_shared/scenes/scene.mjs`): cada escena es una skill del plugin con su recogida de datos, una plantilla HTML fija, un script que construye la página a partir de un snapshot JSON, un directorio de estado local (`${XDG_STATE_HOME:-$HOME/.local/state}/nordic-pantheon/scenes/<escena>/`) donde vive la URL del artifact, y una tarea programada local que la refresca publicando sobre el mismo artifact.
- Nueva skill **Midgard** (`nordic-pantheon:midgard`, `/midgard`), primera escena:
  - Recoge los tickets de Jira asignados al humano que no están en Done (MCP de Atlassian) y sus PRs propias abiertas o recientes en GitHub (`gh`, mediante un script de solo lectura) y en Bitbucket (MCP de Atlassian).
  - Une ticket y PR por la clave del ticket en el nombre de la rama o en el título de la PR.
  - Calcula el estado de cada PR, su revisión, el estancamiento (5 días laborables sin movimiento) y los avisos de coherencia Jira↔repo (tres casos); nunca transiciona ni edita tickets.
  - Muestra los tickets en "Done (Merged in Dev)" (en este Jira, estado en curso) con la etiqueta "mergeado en dev" y sin el aviso de PR mergeada con ticket abierto; los nombres de estado que cuentan así se guardan en el estado de la escena.
  - En Bitbucket lee las PRs del workspace guardado en el estado de la escena, con una lectura de detalle por PR para la rama; aprobaciones requeridas y comentarios sin resolver no están disponibles y la página los omite.
  - Construye la página con el diseño "Tablero de operaciones" (boceto B): franja de cifras, una tabla por repositorio, panel "Sin PR", claro y oscuro.
  - Publica un artifact privado la primera vez, guarda su URL y crea una tarea programada local (a las 08:00 y a las 14:00, de lunes a viernes) que vuelve a publicar en esa misma URL. La página muestra la hora de la última actualización, la próxima y qué fuente falló, si alguna.
- Pruebas con `node --test` de las reglas puras (unión, estado de PR, avisos, días laborables, estancamiento, cifras), del script de construcción con fixtures (incluidos fallos parciales) y del recolector de GitHub con un `gh` falso.
- `bifrost/CLAUDE.md`, `README.md`, `ONBOARDING.md` y `.claude-plugin/plugin.json` (1.7.0) incorporan Midgard y el concepto de escena.
- `mockups/midgard-bocetos/` se elimina cuando la plantilla esté lista: la plantilla de la skill sustituye al boceto B y los bocetos A y C están descartados.

Fuera de alcance: otras escenas (p. ej. PRs donde el humano es revisor), changes OpenSpec, ramas locales, sesiones de Claude, CI/checks, desvíos de Vár, compartir el panel con el equipo, mover o comentar tickets en Jira, festivos en el cálculo de días laborables.

## Capabilities

### New Capabilities
- `pantheon-scenes`: contrato común de las escenas del panteón: skill invocable, estado local con la URL del artifact, página autocontenida construida desde un snapshot, publicación privada siempre sobre el mismo artifact, refresco por tarea programada local, marcas de actualización y de fuentes caídas, y solo lectura sobre las fuentes.
- `midgard-scene`: qué muestra Midgard y con qué reglas: tickets en curso, unión ticket↔PR, estado y revisión de cada PR, agrupación por repositorio, bloque "Sin PR", estancamiento, avisos Jira↔repo y las cifras de cabecera.

### Modified Capabilities
<!-- Ninguna: Midgard no cambia requisitos del instalador, de Bifröst ni de las evals. -->

## Impact

- Archivos nuevos: `skills/_shared/scenes.md`, `skills/_shared/scenes/scene.mjs`, `skills/midgard/SKILL.md`, `skills/midgard/references/role.md`, `skills/midgard/references/collect.md`, `skills/midgard/assets/template.html`, `skills/midgard/scripts/{rules,build,collect-github}.mjs`, `tests/midgard/*.test.mjs`, `tests/fixtures/midgard/` (snapshots de ejemplo y `gh` falso).
- Archivos modificados: `bifrost/CLAUDE.md`, `README.md`, `ONBOARDING.md`, `.claude-plugin/plugin.json`.
- Archivos eliminados: `mockups/midgard-bocetos/` (sin versionar).
- Dependencias en tiempo de ejecución, todas en la máquina del humano: `node` (22 instalado), `gh` con sesión, el MCP de Atlassian conectado (Jira y Bitbucket), la herramienta Artifact y las tareas programadas de la app de escritorio (`mcp__scheduled-tasks__*`), que solo corren con la app abierta.
- Sin cambios en `install.sh` ni en la config del panteón: el estado de la escena vive en su propio directorio.
- Coste: cada refresco es una sesión con `sonnet`/`medium` que hace unas pocas llamadas de lectura a MCP y `gh`, más una lectura de detalle por PR de Bitbucket; dos por día laborable.
