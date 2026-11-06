# Design

## Context

Ver `proposal.md` (Why). Estado observado:

- Frontmatter actual: los 8 forks tienen `context: fork` + `model` (hugin, hugin-graphify, brokkr y bragi `sonnet`; munin-mimir y munin-memory `haiku`; skuld y heimdall `opus`). Odin, hela, forseti y bifrost no tienen `model`. Ninguna skill tiene `effort`.
- Docs de skills (code.claude.com/docs/en/skills.md): `model` en una skill inline rige el resto del turno y no se guarda; la sesión recupera su modelo con el siguiente prompt. `effort` admite `low|medium|high|xhigh|max` y "overrides session effort for the active skill". **Sin confirmar**: si en una skill inline el `effort` dura solo mientras la skill está activa o el resto del turno.
- `bifrost/CLAUDE.md` (líneas 34–47 y 97–103) y `README.md` (tabla "El panteón", sección "Cambiar el modelo de un especialista") describen hoy a Odín, Forseti y Hela "con el modelo de la sesión".
- Ningún test ni eval comprueba `model` ni `effort` (`grep` sobre `tests/`, `install.sh` y `evals/` sin coincidencias).
- `evals/` tiene casos que cargan `/odin` y `/bifrost`; con este change pasan a `opus`.

## Goals / Non-Goals

**Goals:**
- Que modelo y esfuerzo de cada skill estén en un único sitio (su frontmatter) y que la documentación los refleje sin contradecirse.

**Non-Goals:**
- Medir la calidad de cada nivel de esfuerzo o ajustar los valores con evals.
- Fijar modelo o esfuerzo de Bifröst global.

## Decisions

### D1. Valores por responsabilidad
`high` donde el error es caro y el trabajo es de juicio (elicitar, orquestar, planificar, validar); `medium` en ejecución guiada por artefactos (implementar, documentar, explorar leyendo código, git, archivar); `low` en consultas acotadas (memoria, grafo). Los valores exactos son los de la tabla confirmada por el humano (proposal). Alternativa descartada: dejar el esfuerzo de la sesión en los del hilo principal; no permitiría subir a Odín ni bajar a Hela y Forseti.

### D2. `model` en el hilo principal con arrastre aceptado
Se fija `model` en odin, bifrost (`opus`), hela y forseti (`sonnet`) asumiendo que rige el resto del turno. Con estos valores, lo peor que le pasa a Bifröst en el mismo turno es seguir con `sonnet` tras Hela o Forseti. Alternativa descartada: pasar Hela y Forseti a fork; perderían `AskUserQuestion` y queda fuera de alcance.

### D3. Dónde se especifica
Todo va en `specialist-execution`, que ya decide dónde corre cada especialista y con qué modelo: MODIFIED de los dos requisitos existentes (bloques completos, con esfuerzo añadido) y un ADDED para Bifröst (skill y global). `bifrost-activation` no cambia: trata de cómo se activa Bifröst, y su requisito "Bifröst como skill" sigue siendo cierto.

### D4. Documentación
En la tabla del panteón de `bifrost/CLAUDE.md`, "Corre en" pasa a "Corre en / modelo / esfuerzo" con forma `Subagente, sonnet, medium` o `Hilo principal, opus, high`; Bifröst como `Hilo principal, sesión (global) · opus, high (/bifrost)`. El README usa la misma forma. "Especialistas en subagente" explica el arrastre en una frase y conserva "No cambies su modelo al delegar".

### D5. Duración del `effort` inline
Antes de editar, se comprueba en una sesión real: invocar `/odin` en una sesión con esfuerzo distinto de `high`, y al terminar la skill observar el esfuerzo que muestra la interfaz (o `/status`) en el mismo turno y en el siguiente. Si no es observable, se documenta como "rige al menos mientras la skill está activa" y queda como riesgo; los valores no cambian en ningún caso.

*Resultado de 1.1 (2026-11-03): no observable desde el modelo.* En la app de escritorio el modelo no recibe el nivel de esfuerzo activo ni puede ejecutar `/status`, así que no puede comparar el esfuerzo durante la skill, al terminarla y en el turno siguiente. Se documenta que el `effort` de una skill del hilo principal rige al menos mientras la skill está activa; si se arrastra al resto del turno, los valores elegidos siguen siendo aceptables para Bifröst. Comprobación pendiente para el humano: invocar `/odin` y mirar el esfuerzo en la interfaz durante y después.

## Risks / Trade-offs

- [El `effort` de una skill inline podría arrastrarse al resto del turno, como el `model`] → Los valores del hilo principal (`high` en Odín y `/bifrost`, `medium` en Hela y Forseti) son aceptables también para Bifröst; D5 lo deja anotado; 1.1 dio "no observable desde el modelo".
- [`claude plugin validate .` podría rechazar `effort` en 2.1.301] → Se valida tras editar la primera skill; si lo rechaza, parar y devolver a Bifröst.
- [Las evals de `odin-*` y `bifrost-*` pasan a `opus` y pueden acercar la pasada al tope de 2 USD] → Si `tests/evals.sh` sale con 2, repetir solo los casos no ejecutados con `--case`, sin subir el tope.
- [Coste por sesión: Odín y `/bifrost` usan `opus` aunque la sesión sea más barata] → Aceptado por el humano; se cambia editando el frontmatter (README).

## Migration Plan

Sin migración. En modo `link` vale en la siguiente sesión; en `marketplace`, tras `./install.sh update`. Rollback: quitar las líneas `model`/`effort` añadidas.

## Resultado de 4.2 (2026-11-03)

Una pasada de `tests/evals.sh` (tope 2 USD, sin publicar): coste 1,71 USD, código de salida 1 (casos por debajo del umbral, no por tope). Pasan 6 de 8; fallan `brokkr-no-change` (0,75; `pide-lo-que-falta`) y `munin-mimir-empty` (0,67; `dice-que-no-hay`), ambos forks. La salida no contiene URL de claude.ai.

Diagnóstico y repetición (mismo día):

- `munin-mimir-empty` / `dice-que-no-hay`: falso negativo del regex. Munin respondió que Mimir no tenía nada guardado y que ninguna búsqueda devolvió resultados; el juez `no-inventa` dio PASS 3/3. Se amplió el patrón con `|no (tiene|tengo|hay) (nada|registro)` (antes solo `no (tengo|hay)`), `|no encontr[óoéae]` y `|ninguna devolvi`. Comprobado con `grep -Ei`: casa con la respuesta real y no casa con "Decidimos usar RabbitMQ".
- `brokkr-no-change` / `pide-lo-que-falta`: falso negativo del regex. La traza (`--keep-temp`) muestra que la respuesta pide el nombre del change o un plan aprobado con 4 opciones numeradas ("Para seguir necesito una de estas cosas: 1. El nombre del change ... 2. Un plan aprobado ..."), pero sin `?` ni `opci|elige|cuál|cual`. Se añadió al grupo de disparadores (en ambas alternancias) `necesito|una de estas|dime|indica|pásame|pasame|dame|aporta|envía`. No es regresión.
- Repetición con `tests/evals.sh --case` de ambos casos: `munin-mimir-empty` 1,00 y `brokkr-no-change` 1,00. Coste extra: 0,33 USD (0,10 de la ejecución con traza, 0,10 y 0,13 de las repeticiones); total de 4.2 con la pasada inicial: 2,04 USD. Sin URL de claude.ai en la salida.
