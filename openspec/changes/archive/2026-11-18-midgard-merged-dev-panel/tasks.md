# Tasks

<!-- Generado desde plan.json con `bun scripts/protocol.ts tasks midgard-merged-dev-panel`. Solo se marcan casillas; los cambios van a plan.json. -->

## 1. Modelo de vista

- [x] 1.1 T-1 Antes de tocar `rules.mjs`, añadir a `tests/midgard/build.test.mjs` una prueba que fija las seis cifras (`kpis`) del fixture con `SCENE` calculadas con el código actual (design D1). Verificación: `node --test tests/midgard/*.test.mjs` en verde con el código actual y la prueba nueva. Depende de: —. Cubre: midgard-scene/REQ-018
- [x] 1.2 T-2 En `buildView` sacar los tickets mergeados en dev de `panels` y `noPr` al bloque `mergedDev` (repos y PRs con estado y días, `days`, `stale`, `warning`, `incomplete`) y añadir `mergedDevSummary` (provisional, D3); cifras con el mismo valor, contando los tickets sin PR de los dos bloques; quitar `mergedInDev` de las filas de paneles y "Sin PR". Reescribir y ampliar las pruebas de mergeado en dev de `tests/midgard/rules.test.mjs` según design D4. Verificación: `node --test tests/midgard/rules.test.mjs` en verde, con los casos de design D4. Depende de: T-1. Cubre: midgard-scene/REQ-002..REQ-003, midgard-scene/REQ-006..REQ-007, midgard-scene/REQ-013, midgard-scene/REQ-016, midgard-scene/REQ-018, midgard-scene/REQ-021..REQ-022
- [x] 1.3 T-3 Actualizar `tests/midgard/build.test.mjs`: `ICM-1470` e `ICM-1471` en `mergedDev` y ausentes de `panels` y `noPr`, `jiraMergedStatuses: []` los devuelve a panel y "Sin PR" con aviso (1) en `ICM-1470`, y las cifras siguen iguales a las fijadas en T-1. Verificación: `node --test tests/midgard/*.test.mjs` en verde; la prueba de T-1 no se ha modificado. Depende de: T-1, T-2. Cubre: midgard-scene/REQ-003, midgard-scene/REQ-007, midgard-scene/REQ-016, midgard-scene/REQ-018

## 2. Plantilla

- [x] 2.1 T-4 En `skills/midgard/assets/template.html`, cargando antes la skill `artifact-design`: panel `<details>` "Mergeados en dev" sin `open`, último de `.panels`, con `<summary>` (total y, provisional D3, estancados y avisos), lista compacta (clave, título, repositorios, enlaces `#N` con estado, marca de estancado, aviso ámbar, "incompleto") y foco visible; quitar `chip.dev` de `jiraCell` y su CSS. Añadir a `build.test.mjs`, con la plantilla real, las comprobaciones de HTML de design D4. Verificación: `node --test tests/midgard/*.test.mjs` en verde, con `<details` sin `open`, `<summary>` "Mergeados en dev" y sin la etiqueta "mergeado en dev" en filas. Depende de: T-2. Cubre: midgard-scene/REQ-020..REQ-022
- [x] 2.2 T-5 Comprobación visual de la plantilla con los fixtures (`node skills/midgard/scripts/build.mjs --state-dir <scratch> --now 2026-11-17T08:00:00Z`) en el panel del navegador: claro, oscuro con `data-theme="dark"`, 375 px con el panel desplegado y teclado (Tab hasta el `<summary>`, Enter y Espacio); capturas en el scratchpad. Verificación: Capturas en claro, oscuro y 375 px; `document.documentElement.scrollWidth <= innerWidth` con el panel desplegado; el `<summary>` recibe el foco visible y Enter y Espacio alternan `open`. Depende de: T-4. Cubre: midgard-scene/REQ-020..REQ-021

## 3. Documentación

- [x] 3.1 T-6 Actualizar solo la subsección "### Midgard" de `README.md` ("Qué muestra", "Estancado", "Tickets 'mergeado en dev'") y la nota de `status` de `skills/midgard/references/collect.md` según design D5. Verificación: `grep -n 'mergeado en dev\|Mergeados en dev' README.md skills/midgard/references/collect.md` describe el panel plegado, que las cifras lo cuentan y que no da el aviso (1); ningún texto habla ya de la etiqueta en las filas. Depende de: T-4. Cubre: —

## Workflow follow-up

- Confirmar con el humano la opción de D3 (motivos visibles); si no es la provisional, Skuld ajusta REQ-022, D3 y T-2/T-4 antes de aplicar
- Validar con Heimdall y archivar con Hela
- Refresco real con `/midgard` para ver el panel con datos de Jira
