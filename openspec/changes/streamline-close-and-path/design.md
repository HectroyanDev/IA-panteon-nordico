# Design

## Context

El cierre encadenado reparte una decisión entre tres piezas (Bifröst decide a quién cargar, Heimdall da el veredicto, Hela archiva o pregunta) y la elección de camino reescribe un requisito que `add-bifrost-protocol` renombra. Este documento fija qué cuenta como "limpio", cómo detecta Hela el orden de archivo y en qué orden se archiva este change.

## Decisions

### D1. Veredicto limpio explícito en el informe de Heimdall
En el camino OpenSpec, Heimdall cierra su informe con una línea `Veredicto: limpio | avisos | crítico` y el número de CRITICAL y WARNING. `limpio` = cero CRITICAL y cero WARNING; los SUGGESTION no cuentan. Las tareas pendientes las comprueba Hela leyendo las casillas de `tasks.md`, no Heimdall. Bifröst pasa a Hela esa línea en el encargo. Alternativa descartada: que Bifröst interprete el texto libre del informe, frágil y sin una regla que citar.

### D2. Orden de archivo declarado en los artefactos
Hela busca en `proposal.md`, `design.md` y `decisions.md` una frase de orden de archivo que nombre otro change (como "Orden de archivo: X antes que este change") y comprueba si ese change sigue en `openspec/changes/`. Como respaldo, el aviso `Archive would refuse this delta` de `openspec validate <change>` también para el archivo. Alternativa descartada: un campo nuevo en `.openspec.yaml`, que el CLI no conoce.

### D3. MODIFIED con el título renombrado; archivar después de `add-bifrost-protocol`
El delta de `plan-mode-path` modifica `REQ-001 Elección entre plan mode y OpenSpec`, el título que deja `add-bifrost-protocol`. Hasta que ese change se archive, `openspec validate` pasa con un INFO y `openspec archive` rechazaría el delta. Este change es el primer caso de D2.

### D4. Anti-waterfall acotado
Antes del `Sí, confirmo` la regla no cambia: nada de encadenar fases sin que la petición lo pida. Tras él, Skuld → Brokkr ya podía encadenarse y ahora Brokkr → Heimdall → Hela es la norma del camino OpenSpec, con Hela preguntando si el veredicto no es limpio.

## Risks / Trade-offs

- [Hela archiva algo que el humano quería revisar] → solo con veredicto limpio y sin pendientes; el commit sigue pidiendo permiso.
- [Una frase de orden de archivo escrita de otra forma] → el respaldo de `openspec validate` cubre los MODIFIED y RENAMED que no casan.
