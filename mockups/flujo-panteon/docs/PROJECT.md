# Panteón — Mockup

> Ficha general del mockup. La skill `mockups-build` la lee junto con un `.md` por escenario.
> Si algo cambia aquí, debe cambiar también en la web (y al revés).

## Ficha

| Campo | Valor |
| --- | --- |
| id | `panteon` |
| Idioma por defecto | `es` (la web abre en español; conmutador ES · EN) |
| Eyebrow | Nordic Pantheon · mockup de flujos |
| Título | Cómo se trabaja con Bifröst y el panteón |
| Lead | Paso a paso, qué ocurre entre tú, Bifröst y los especialistas en cada camino, con una petición de ejemplo por escenario. ¿Alguna palabra rara? Mira el glosario. Las normas y la configuración están en ONBOARDING.md, en la raíz del repo. |
| Pie | Complemento visual de ONBOARDING.md (desde esta carpeta: ../../ONBOARDING.md). Las peticiones, rutas y nombres son ejemplos inventados; el comportamiento sale de las skills, bifrost/CLAUDE.md, el README y hooks/var.tsx. Lo que es interpretación se marca como tal. |

## Vistas

| id | Nombre | Documento donde se discute | Frase del glosario |
| --- | --- | --- | --- |
| `flujo` | Flujos | — | Los términos de estos flujos, explicados sin jerga. |

Con una sola vista, el conmutador de vistas queda oculto. No hay botón de comentarios útil: el motor lo muestra siempre y, sin documento de Confluence, el diálogo avisa de que no hay documento todavía.

## Escenarios

| id | Vista | Documento `.md` | Estado |
| --- | --- | --- | --- |
| `flujo-plan` | `flujo` | `PLAN-MODE.md` | hecho (20 pasos, 3 ramas) |
| `flujo-openspec` | `flujo` | `OPENSPEC.md` | hecho (18 pasos, 3 ramas) |
| `flujo-memoria` | `flujo` | `HUGIN-MUNIN.md` | hecho (10 pasos, 3 ramas) |
| `flujo-tyr` | `flujo` | `TYR.md` | hecho (12 pasos, 1 rama) |

## Leyenda

| Zona | Nombre |
| --- | --- |
| channel | Humano |
| server | Orquestador |
| venue | Hilo principal |
| staff | Subagentes |
| external | Segundo plano / externo |

## Glosario de la vista `flujo`

| Término | Qué es | Aquí (opcional) | Palabras enlazadas |
| --- | --- | --- | --- |
| Bifröst | El orquestador. Clasifica la petición, delega en el mínimo de especialistas y entrega el resultado. No hace el trabajo de ellos. |  | Bifröst |
| Subagente | Especialista que corre aparte, con su propio contexto y modelo. No ve la conversación y no puede preguntar al humano. | Hugin, Munin, Skuld, Brokkr y Heimdall. | subagente, subagentes, Subagente, Subagentes |
| Hilo principal | La conversación con el humano. Los especialistas que corren aquí pueden preguntar, pedir permiso o enseñar una vista previa. | Odín, Forseti, Hela y Tyr. | hilo principal, Hilo principal |
| Encargo completo | Todo lo que un subagente necesita, porque no ve la conversación: objetivo, requisitos confirmados, rutas y decisiones ya tomadas. |  | encargo completo, Encargo completo |
| Plan mode | Modo de Claude Code en el que solo se lee y se planifica. No se edita código hasta que el humano aprueba el plan. |  | plan mode, Plan mode |
| OpenSpec | Flujo por fases con los comandos /opsx:* (propose, apply, verify, archive) para cambios que añaden o modifican comportamiento. |  | OpenSpec |
| Change | Unidad de trabajo de OpenSpec, con nombre y con su carpeta openspec/changes/<nombre>/ (proposal, specs, design, tasks). |  | change, changes, Change |
| Spec | Descripción escrita del comportamiento que debe tener el sistema. Heimdall valida la implementación contra ella. |  | spec, specs, Spec |
| AskUserQuestion | Herramienta de Claude Code que hace preguntas con opciones concretas. Es el único canal por el que el panteón pregunta al humano. |  | AskUserQuestion |
| Vár | Vigilante en segundo plano: comprueba que el trabajo no se desvíe del plan aprobado y, si se desvía, recuerda el plan. |  | Vár |
| Desvío persistente | Tras dos correcciones de Vár en un hilo, el siguiente desvío de ese hilo ya no se corrige: se notifica al humano, que decide. |  | desvío persistente, Desvío persistente |
| Modelo en estrella | Bifröst en el centro y cada especialista en una punta. Los especialistas no se llaman entre sí: devuelven a Bifröst lo que no es suyo. |  | modelo en estrella, Modelo en estrella |
| Waive | Renuncia explícita del humano a una condición. Hela no archiva un change sin verify superado o sin un waive. |  | waive, Waive |
| Lente | Cada una de las tres revisiones en paralelo de Tyr sobre el diff de una PR: lógica, seguridad y calidad. |  | lente, lentes, Lente, Lentes |

## Comparación

Ninguna: no se pidió página de comparación.

## Contrato

Ninguno: no hay mensajes ni endpoints propios que documentar.

## Decisiones

No hay página `#decisions`: esa página modela listas de abierto y acordado por área, y aquí lo pedido era el criterio de camino. Las «Abiertas» de cada escenario siguen en su `.md` y en su sección «Abierto en este escenario». El criterio y la tabla van como secciones de la vista, bajo cada escenario:

### Plan mode u OpenSpec: una sola pregunta

- ¿El cambio añade o modifica comportamiento que merezca spec?
- Sí: camino OpenSpec (escenario 2).
- No (ajuste, refactor, arreglo): camino plan mode (escenario 1).
- Si Bifröst duda, te pregunta qué camino seguir antes de entrar en plan mode o de delegar en Skuld.
- Normas, configuración y detalle: ONBOARDING.md, en la raíz del repo (desde esta carpeta, ../../ONBOARDING.md).

### De la intención al especialista

Bifröst elige un subconjunto, nunca el stack completo por defecto.

| Tu intención | Quién actúa |
| --- | --- |
| Mecánico (rename, typo, comando exacto) | Bifröst, inline |
| Buscar, «¿cómo funciona X?» | Hugin y/o Munin; Bifröst responde |
| Recordar trabajo pasado | Munin (Hugin solo si la memoria está vacía) |
| Trabajo no trivial con requisitos incompletos | Odín |
| Cambio pequeño sin comportamiento nuevo | Plan mode: Odín, Brokkr, Heimdall |
| Change sustancial con requisitos confirmados | OpenSpec: Skuld y siguientes |
| Tasks listos, implementar | Brokkr |
| «¿Vamos según el plan?» | Vár (/var) |
| «¿Cumple la spec?» | Heimdall; si pasa, ofrece Hela |
| Revisar una PR (URL) | Tyr |
| Documentar | Bragi |
| Commits, ramas, PR | Forseti, con permiso explícito |
| Cerrar o archivar un change | Hela |
