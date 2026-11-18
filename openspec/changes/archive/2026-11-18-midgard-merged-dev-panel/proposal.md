# Proposal

## Why

Los tickets en "Done (Merged in Dev)" ya no piden trabajo del humano (su código está en dev y esperan la subida), pero hoy se mezclan con los que sí lo piden en los paneles por repositorio y en "Sin PR", solo distinguidos por una etiqueta. Con varios tickets así, los paneles se llenan de filas que no requieren acción y lo que sí la requiere se ve peor.

## What Changes

- Los tickets cuyo estado está en `jiraMergedStatuses` (por defecto `["Done (Merged in Dev)"]`) dejan de aparecer en los paneles por repositorio y en "Sin PR". Pasan a un panel propio, **"Mergeados en dev"**, al final de la página.
- El panel es una lista compacta: clave enlazada a Jira, título, repositorios y enlace a cada PR, sin detalle de revisión (aprobaciones, hilos, revisores). Está **plegado** al cargar la página, se despliega con un clic o con el teclado y su cabecera muestra el total de tickets aunque esté plegado. Sin tickets mergeados en dev, el panel no aparece.
- Las seis cifras de cabecera **siguen contando** estos tickets y sus PRs, igual que ahora (decidido por el humano).
- Siguen sin dar el aviso (1) y se siguen evaluando para los avisos (2) y (3) y para el estancamiento.
- **Provisional, pendiente de confirmar por el humano**: para que las cifras "Estancadas" y "Avisos Jira ↔ repo" no cuenten tickets cuyo motivo no se ve, la fila compacta muestra la marca de estancado (con sus días) y el aviso con su texto y enlaces, cada enlace a PR lleva su estado, y la cabecera del panel dice, también plegada, cuántos de sus tickets están estancados y cuántos tienen aviso.
- La etiqueta "mergeado en dev" desaparece de las filas: la pertenencia al panel la sustituye.
- Pruebas de `rules.mjs` y `build.mjs` actualizadas, comprobación visual de la plantilla (claro, oscuro, móvil, teclado) y README y `references/collect.md` al día.

Fuera de alcance: cambiar qué estados cuentan como mergeado en dev o cómo se reconocen, recordar entre visitas si el panel estaba desplegado, ordenar o filtrar la lista, y cambiar las reglas de los avisos o del estancamiento.

## Capabilities

### New Capabilities

<!-- Ninguna. -->

### Modified Capabilities

- `midgard-scene`: los tickets mergeados en dev salen de los paneles por repositorio y de "Sin PR" a un panel propio plegado (REQ-002, REQ-003, REQ-006, REQ-007, REQ-016, REQ-020 y dos requisitos nuevos); el estancamiento y las cifras se reescriben para seguir contándolos fuera de "Sin PR" (REQ-013, REQ-018).

## Impact

- Código: `skills/midgard/scripts/rules.mjs` (`buildView`: nuevo bloque del snapshot para el panel, filtrado de paneles y "Sin PR", cifras sin cambio de valor) y `skills/midgard/assets/template.html` (panel plegable, sin la etiqueta en las filas).
- Pruebas: `tests/midgard/rules.test.mjs` y `tests/midgard/build.test.mjs`; los fixtures actuales (`ICM-1470` con PR mergeada, `ICM-1471` sin PR y quieto) ya cubren los dos casos principales.
- Documentación: subsección Midgard de `README.md` y `skills/midgard/references/collect.md`. `skills/midgard/SKILL.md` no describe la presentación y no cambia.
- Sin cambios en la recogida, en `scene.json`, en `build.mjs` ni en la librería de escenas. El snapshot gana un campo; la plantilla y el snapshot salen siempre juntos de `build.mjs`, así que no hay compatibilidad que mantener.
