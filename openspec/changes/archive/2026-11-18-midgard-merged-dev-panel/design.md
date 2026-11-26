# Design

## Context

Motivación en `proposal.md`; comportamiento en `specs/midgard-scene/spec.md`. Decisiones de origen en `openspec/changes/archive/2026-11-17-add-midgard-scene/design.md` (D6 reglas, D8 plantilla, D11 pruebas). Estado observado:

- `buildView` (`skills/midgard/scripts/rules.mjs`) marca cada ticket con `mergedInDev` y lo reparte como cualquier otro: filas en `panels` (una por PR) o en `noPr`. Las cifras salen de `tickets` (todos), de las PRs únicas por URL de todos los tickets y de `noPrRows` para los tickets estancados sin PR.
- `assets/template.html` pinta la etiqueta `chip.dev` "mergeado en dev" en la columna Jira de ambas tablas. No hay ningún elemento plegable todavía.
- Los fixtures tienen `ICM-1470` (mergeado en dev, PR #2350 mergeada en `feverup/payments-api`) e `ICM-1471` (mergeado en dev, sin PR, actualizado el 10 nov: 5 días laborables a `NOW` = martes 17 nov). Ninguno tiene PR abierta ni aviso.
- `build.mjs` solo pasa `mergedStatuses` a `buildView` y no cambia.

## Goals / Non-Goals

**Goals:**
- Sacar los tickets mergeados en dev de `panels` y `noPr` a un bloque propio del snapshot, sin cambiar el valor de ninguna cifra.
- Panel plegable nativo, sin JavaScript para abrir o cerrar.

**Non-Goals:**
- Recordar entre visitas si el panel estaba desplegado (sería `localStorage`; la página se regenera dos veces al día y el plegado por defecto es el comportamiento pedido).
- Tocar `isMergedInDev`, `coherenceWarning`, `isStale` o la recogida.

## Decisions

### D1. Modelo de vista: bloque `mergedDev` en el snapshot

`buildView` separa los tickets por `mergedInDev` antes de construir filas:

- `panels` y `noPr` se construyen solo con los tickets no mergeados en dev. Un repositorio cuyas PRs solo enlazan a tickets mergeados en dev no tiene panel. Una PR compartida con un ticket no mergeado sigue en el panel por la fila de ese ticket.
- `mergedDev`: una fila por ticket, en el orden de Jira (la JQL ordena por `updated DESC`):
  `{ key, ticketUrl, title, status, repos: [{ host, hostLabel, repo, prs: [{ number, url, state, statusCode, statusLabel, days, stale }] }], days, stale, warning, incomplete }`.
  - `repos` agrupa las PRs enlazadas por `host:repo`, en el orden de los paneles (PRs ordenadas por número). Vacío si no hay PRs.
  - `days`: días del ticket (`updated`) si no tiene PRs; si las tiene, `null` (los días van en cada PR).
  - `stale`: ticket sin PRs y estancado, o alguna PR abierta estancada.
  - `warning`: el de `coherenceWarning` con los mismos enlaces que en los paneles (`ticketUrl`, `prs`).
  - `incomplete`: el de `coherenceWarning` y, si el ticket no tiene ninguna PR visible, además los hosts caídos, igual que en "Sin PR" (sin PR visible, la que falta puede estar en la fuente caída).
- Resumen para la cabecera del panel (provisional, D3): `mergedDevSummary: { total, stale, warned }`, donde `stale` usa las unidades de la cifra de estancadas (PRs abiertas estancadas únicas por URL más tickets sin PR estancados) y `warned` cuenta tickets con aviso.
- Cifras: se calculan como hoy sobre todos los tickets. El único cambio de código es que el sumando "tickets sin PR estancados" deja de leerse de `noPrRows` y pasa a contar los tickets sin PR de los dos bloques. Una prueba fija los valores del fixture antes del cambio y los compara después (T-1, T-3).
- El campo `mergedInDev` desaparece de las filas de `panels` y `noPr`: allí siempre sería `false` y la plantilla ya no lo usa.

`version` del snapshot sigue en 1: `snapshot.json` solo lo lee la plantilla que `build.mjs` incrusta en la misma construcción.

*Alternativas*: (a) Marcar las filas existentes con `mergedInDev` y filtrarlas en la plantilla: las cifras y el reparto quedarían en sitios distintos y las pruebas de `buildView` no verían el panel. Descartada. (b) Una fila por PR como en los paneles: repite el ticket y contradice "lista compacta". Descartada.

### D2. Plantilla: `<details>` nativo

- El panel es `<details class="panel merged">` sin atributo `open`, último elemento de `.panels`, con `<summary>` como cabecera (mismo aspecto que `.panel > header`: fondo `--console-head`, título en `--f-mono`, total a la derecha en `.host`). `<details>` da sin código el plegado por defecto, el clic, Enter y Espacio, el foco con Tab y el estado expandido para lectores de pantalla.
- Marcador propio (triángulo que gira) con `list-style: none` y `summary::-webkit-details-marker { display: none }`; `summary:focus-visible` con el mismo contorno que los enlaces (`2px solid var(--accent)`).
- Cuerpo: lista `<ul>` sin tabla, así que no necesita `.scroll` ni `min-width`. Cada `<li>`: clave enlazada (`--f-mono`), título con `overflow-wrap: anywhere`, y una línea con cada repositorio (`.host`) seguido de sus enlaces `#N`. Sin PR: texto "sin PR" en `--muted`. En móvil la línea de repositorios hace `flex-wrap`.
- La etiqueta `chip.dev` y su CSS se eliminan de `jiraCell`.
- Solo tokens existentes; claro y oscuro funcionan sin reglas nuevas de color. Brokkr carga la skill `artifact-design` y comprueba el contrato (tokens, modo oscuro, móvil sin desplazamiento horizontal).

### D3. Motivos visibles de las cifras (PROVISIONAL, pendiente de confirmar por el humano)

Problema: las cifras "Estancadas" y "Avisos Jira ↔ repo" (y también "PRs abiertas", "Esperando revisión" y "Cambios pedidos", si un ticket mergeado en dev tiene una PR abierta que ningún otro ticket nombra) pueden contar elementos cuyo motivo no se ve en una lista compacta plegada.

Opción provisional escrita en la spec (REQ-022), aislada en ese requisito, en `mergedDevSummary` y en la parte de T-4 que la pinta, para poder cambiarla sin tocar lo demás:
- Cabecera plegada: total y, solo si son mayores que cero, "N estancados" (rojo, como `.stale-tag`) y "N avisos" (ámbar).
- Fila: marca roja de estancado con los días ("● 5 d") cuando `stale`; el aviso como el `.alert` ámbar de los paneles, debajo de la fila; "incompleto: <fuente>" con el `chip.incomplete` existente.
- Cada enlace a PR lleva un chip con su estado (`statusLabel`, mismos tonos que los paneles) y su marca de estancado si la tiene. Es el estado de la PR, no detalle de revisión: no hay aprobaciones, hilos ni revisores.

Alternativas que el humano puede elegir en su lugar (ver la pregunta en el resumen de Skuld):
- (B) Excluir los tickets mergeados en dev de "Estancadas" y "Avisos" (las otras cuatro siguen contándolos): cambia lo decidido ("Sí cuentan") para dos cifras.
- (C) Como la provisional, pero el panel se abre solo al cargar cuando contiene algún estancado o aviso.
- (D) Un ticket mergeado en dev con aviso o estancamiento se queda en los paneles normales; solo los "tranquilos" van al panel plegado: excepción al requisito 1.

### D4. Pruebas

- `tests/midgard/rules.test.mjs`: se reescriben las tres pruebas actuales de mergeado en dev (ahora en `v.mergedDev`, no en `rowsOf(v)` ni en `v.noPr`) y se añaden: repositorio solo con PRs de tickets mergeados → sin panel; PR abierta compartida con un ticket no mergeado → en el panel por ese ticket, enlazada en `mergedDev` y contada una vez; mergeado en dev con PR abierta estancada → `stale`, cifras y `mergedDevSummary.stale`; aviso (3) en un mergeado en dev (estado incluido en `mergedStatuses` con categoría `new`) → `warning` en la fila y en `warned`; GitHub caído sin datos y mergeado sin PR visible → `incomplete: ["GitHub"]`; `mergedStatuses: []` → `mergedDev` vacío.
- `tests/midgard/build.test.mjs`: `ICM-1470` e `ICM-1471` en `mergedDev` y ausentes de `panels` y `noPr`; las seis cifras del fixture iguales a las fijadas en T-1; con la plantilla real, el HTML contiene un `<details` sin `open` con `<summary>` "Mergeados en dev" y no contiene "mergeado en dev" como etiqueta de fila; con `jiraMergedStatuses: []`, sin `<details`.
- Comprobación visual (T-5) con la plantilla real y los fixtures, en el panel del navegador: claro, oscuro (`data-theme="dark"` en `<html>`, porque una página local abre siempre en claro), 375 px con el panel desplegado y `document.documentElement.scrollWidth <= innerWidth`, y teclado (Tab hasta el `<summary>`, Enter y Espacio).

### D5. Documentación

- `README.md`, solo la subsección "### Midgard": "Qué muestra" (el panel "Mergeados en dev", plegado, y que las cifras los cuentan), "Estancado" (un ticket sin PR, esté en "Sin PR" o en "Mergeados en dev") y "Tickets 'mergeado en dev'" (panel propio en lugar de etiqueta; sin aviso (1)).
- `skills/midgard/references/collect.md`: la nota de `status` dice que de él sale el panel "Mergeados en dev", no la etiqueta.
- `skills/midgard/SKILL.md` no describe la presentación (solo la clave `jiraMergedStatuses`, que no cambia): sin cambios.

## Risks / Trade-offs

- [Algo que pide acción queda plegado] → Mitigado por D3 provisional (cabecera con estancados y avisos); si el humano elige otra opción, cambia solo REQ-022, `mergedDevSummary` y esa parte de la plantilla.
- [La cifra de estancadas cambia de valor sin querer al mover el sumando de tickets sin PR] → T-1 fija las seis cifras del fixture antes de tocar `rules.mjs`.
- [`<details>` y su marcador se ven distintos entre motores] → Marcador propio y `summary` con `display: flex`; comprobación visual en T-5.
- [Un estado renombrado en Jira deja de reconocerse] → Igual que hoy: el ticket vuelve a los paneles y el aviso (1) reaparece (fallo visible).

## Migration Plan

Sin migración: el siguiente refresco (`/midgard` o la tarea programada) publica la página nueva sobre el mismo artifact. `scene.json` no cambia. Marcha atrás: revertir `rules.mjs` y `template.html` y refrescar.
