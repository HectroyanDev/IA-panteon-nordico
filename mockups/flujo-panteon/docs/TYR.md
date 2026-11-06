# Panteón — Flujos: Revisión de PR con Tyr

> Borrador para discusión · 2026-11-04. Dice lo mismo que el mockup: vista «Flujos», escenario «Revisión de PR con Tyr» (`#flujo-tyr`, 12 pasos, 1 rama). Si uno cambia, el otro debe cambiar también.
>
> Etiquetas:
> - **[A]** acordado;
> - **[P]** interpretación, pendiente de validar;
> - **[?]** por decidir;
> - **[V]** hecho verificado en las fuentes del repo.
>
> Complemento de `../../../ONBOARDING.md` (normas y configuración).

---

## 1. La idea [V]

1. **Tyr revisa en tres lentes en paralelo.** Lógica, seguridad y calidad, como subagentes lanzados en un solo mensaje, sobre las líneas añadidas o modificadas. [V]
2. **Nada se publica sin un sí.** Primero una vista previa con hallazgos y veredicto; después se pregunta con AskUserQuestion. [V]
3. **El veredicto sale de la gravedad.** Una ALTA o MEDIA, nueva o pendiente, implica pedir cambios; solo BAJA o nada implica aprobar. [V]

Los nombres de peticiones, rutas, funciones y changes son ejemplos inventados; el comportamiento sale de las skills, `bifrost/CLAUDE.md`, el README y `hooks/var.tsx`.

---

## Mockup

### Ficha

| Campo | Valor |
| --- | --- |
| id | `flujo-tyr` |
| Vista | Flujos (`flujo`) |
| Título | Revisión de PR con Tyr |
| Subtítulo | Tres lentes en paralelo, vista previa de los comentarios y publicación solo con tu sí |
| Código de ejemplo | `pr-123` |
| Documento | — |

### Piezas del diagrama

Zonas: `channel` Humano · `server` Orquestador · `venue` Hilo principal · `staff` Subagentes · `external` Segundo plano / externo.

| id | Nombre | Subtítulo | Zona | Posición |
| --- | --- | --- | --- | --- |
| `human` | Humano | Desarrollador | channel | 150,330 |
| `bifrost` | Bifröst | Orquestador | server | 500,110 |
| `tyr` | Tyr | Revisor de PRs | venue | 560,340 |
| `lentes` | Tres lentes | Lógica · Seguridad · Calidad | staff | 990,160 (ancha) |
| `github` | GitHub | CLI gh · la PR | external | 990,520 |

**Grupos:** ninguno (el color de cada caja marca su zona).

### Conexiones

| id | De | A | Etiqueta | Tipo |
| --- | --- | --- | --- | --- |
| `bf_h` | `bifrost` | `human` | conversación | normal |
| `bf_tyr` | `bifrost` | `tyr` | carga | normal |
| `tyr_h` | `tyr` | `human` | vista previa | normal |
| `tyr_lentes` | `tyr` | `lentes` | brief en paralelo | normal |
| `tyr_gh` | `tyr` | `github` | gh | normal |

Una respuesta usa la misma conexión «al revés».

### Aparatos

| id | Tipo | Nombre | Piezas que representa |
| --- | --- | --- | --- |
| `chat-pr` | desktop | Conversación en Claude Code | `human` |
| `pr-github` | desktop | PR en GitHub | `github` |

### Pantallas

**Al empezar:** todo apagado.

#### `chat-pr` · `request`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «Revisa https://github.com/org/repo/pull/123»

#### `chat-pr` · `working`
- Spinner
- Texto pequeño: «Tyr revisa con tres lentes»

#### `chat-pr` · `preview`
- Panel clave-valor «Vista previa · PR #123 · a1b2c3d»: 🔴 ALTA · promo.js:31 = SQL con entrada del usuario · 🟡 MEDIA · applyPromo.js:58 = descuento mayor que el total · 🔵 BAJA · PromoInput.jsx:12 = número mágico · Veredicto = Cambios solicitados (resaltado)

#### `chat-pr` · `ask`
- Pantalla nativa: AskUserQuestion
- Arriba
- Texto pequeño: «Tyr: 3 hallazgos, nada publicado todavía. ¿Publico?»
- Opciones de botón: «Publicar todo» (seleccionada) · «Publicar sin alguno» · «No publicar»

#### `chat-pr` · `answerYes`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «Publicar todo»
- Texto pequeño (gris): «Es el sí a la vista previa.»

#### `chat-pr` · `answerNo`
- Arriba
- Texto pequeño (gris): «Tú»
- Texto: «No publicar»
- Texto pequeño (gris): «Sin un sí, Tyr no publica nada.»

#### `chat-pr` · `delivery`
- Arriba
- Filas: Qué se hizo = 3 comentarios, CAMBIOS · Qué queda = que el autor corrija
- Texto pequeño (gris): «Siguiente: re-revisar tras los cambios»

#### `chat-pr` · `deliveryNone`
- Arriba
- Filas: Qué se hizo = revisión sin publicar · Qué queda = nada en la PR
- Texto pequeño (gris): «Siguiente: dime si publico otra vez»

#### `pr-github` · `fetched`
- Panel clave-valor «org/repo · PR #123» (etiqueta «gh»): Título = feat(checkout): código promocional · Head = a1b2c3d (resaltado) · Archivos = 3 (+112 −8) · Comentarios de Tyr = 0

#### `pr-github` · `published`
- Panel clave-valor «org/repo · PR #123» (etiqueta «gh api …/reviews»): Comentarios inline = 3 (resaltado) · Resumen = 1 (resaltado) · Revisión = REQUEST_CHANGES (resaltado)

#### `pr-github` · `untouched`
- Panel clave-valor «org/repo · PR #123» (etiqueta «gh»): Comentarios nuevos = 0 · Revisión = sin cambios

### Pasos

#### 1. Pides revisar una PR
- **Quién:** Tú, en la conversación
- **Dónde:** pieza `human`
- **Pantallas:** `chat-pr` → `request`
- **Qué ocurre:** Pegas la URL de la PR. También puedes invocar directamente /tyr <url PR>: el resultado es el mismo.
- **Qué viaja:**
  ```
  Tú: Revisa https://github.com/org/repo/pull/123
  ```

#### 2. Bifröst clasifica y carga a Tyr
- **Quién:** Bifröst → Tyr
- **Dónde:** conexión `bf_tyr`
- **Qué ocurre:** Revisar una PR va a Tyr, y no a Brokkr, Heimdall ni Forseti. Tyr corre en el hilo principal porque pregunta antes de publicar.
- **Qué viaja:**
  ```
  Intención: revisar una PR (URL)
  → Tyr (publica solo con un sí a la vista previa)
  Omite: Brokkr, Heimdall, Forseti
  ```
- **Fuente:** bifrost/CLAUDE.md · Tabla de decisión

#### 3. Tyr lee la PR con gh
- **Quién:** Tyr → GitHub
- **Dónde:** conexión `tyr_gh`
- **Pantallas:** `pr-github` → `fetched`
- **Qué ocurre:** Una URL de github.com se trabaja con la CLI gh: metadatos y head SHA, diff y todos los comentarios existentes. Con una URL de bitbucket.org usaría el MCP de Atlassian.
- **Qué viaja:**
  ```
  gh pr view https://github.com/org/repo/pull/123 --json number,title,body,headRefName,baseRefName,headRefOid,author,url
  gh pr diff https://github.com/org/repo/pull/123
  gh api repos/org/repo/pulls/123/comments --paginate
  ← head a1b2c3d · 3 archivos · 0 comentarios previos de Tyr
  ```
- **Fuente:** skills/tyr/references/platforms.md

#### 4. Tyr prepara el mapa de líneas cambiadas
- **Quién:** Tyr
- **Dónde:** pieza `tyr`
- **Qué ocurre:** Solo se revisan líneas añadidas o modificadas. Construye el mapa archivo → líneas del lado nuevo, salta lockfiles, dist y archivos generados, carga solo las convenciones de los lenguajes del diff y lee las reglas del repo en el head.
- **Qué viaja:**
  ```
  src/api/promo.js              líneas 24-41
  src/checkout/applyPromo.js    líneas 50-72
  src/components/PromoInput.jsx líneas 8-30
  Lenguajes: js, react
  ```
- **Clave:** Las reglas del repo (CLAUDE.md, eslint, prettier…) mandan sobre las convenciones de Tyr.
- **Fuente:** skills/tyr/SKILL.md · Execution Steps, pasos 2 a 3

#### 5. Tyr lanza las tres lentes en un solo mensaje
- **Quién:** Tyr → lentes
- **Dónde:** conexión `tyr_lentes`
- **Pantallas:** `chat-pr` → `working`
- **Qué ocurre:** Lógica, seguridad y calidad corren como subagentes en paralelo. No ven la conversación: el brief lleva la PR, el mapa de líneas, el diff, las reglas del repo y las convenciones. Solo leen.
- **Qué viaja:**
  ```
  Brief común a cada lente
  PR: https://github.com/org/repo/pull/123 · head a1b2c3d · base main
  Mapa de líneas (solo lado nuevo): (archivo → rangos)
  Diff · reglas del repo · convenciones js y react
  Gravedad: ALTA / MEDIA / BAJA
  Devuelve solo JSON válido (finding.schema.json)
  ```
- **Clave:** Las lentes no se hablan entre sí: cada una devuelve a Tyr su JSON, igual que los especialistas devuelven a Bifröst.
- **Fuente:** skills/tyr/references/reviewers.md

#### 6. Las lentes devuelven sus hallazgos
- **Quién:** Lentes → Tyr
- **Dónde:** conexión `tyr_lentes` al revés
- **Qué ocurre:** Cada hallazgo se ancla a una línea del mapa y solo se reporta si se puede explicar el caso concreto en que falla. La lente de seguridad encuentra el SQL concatenado; la de lógica, el descuento sin tope; la de calidad, un número mágico.
- **Qué viaja:**
  ```
  seguridad: src/api/promo.js:31  ALTA   consulta SQL con req.query.code concatenado
  lógica:    src/checkout/applyPromo.js:58  MEDIA  descuento puede superar el total; sin test
  calidad:   src/components/PromoInput.jsx:12  BAJA  número mágico 8 como longitud máxima
  ```
- **Fuente:** skills/tyr/references/reviewers.md

#### 7. Tyr une, deduplica y calcula el veredicto
- **Quién:** Tyr
- **Dónde:** pieza `tyr`
- **Qué ocurre:** Descarta hallazgos fuera del mapa, deduplica por archivo, línea y causa, y decide: cualquier ALTA o MEDIA nueva o pendiente implica «pedir cambios»; solo BAJA o nada implica «aprobar».
- **Qué viaja:**
  ```
  1 ALTA + 1 MEDIA + 1 BAJA → veredicto: pedir cambios
  ```
- **Fuente:** skills/tyr/SKILL.md · Decision Gates

#### 8. Tyr te enseña la vista previa y pregunta
- **Quién:** Tyr → tú
- **Dónde:** conexión `tyr_h`
- **Pantallas:** `chat-pr` → `preview`
- **Qué ocurre:** Antes de publicar nada, ves la tabla de hallazgos (gravedad, archivo:línea, título), el estado de re-revisión y el veredicto. Después Tyr pregunta con AskUserQuestion: publicar todo, publicar sin algunos o no publicar. Y espera.
- **Qué viaja:**
  ```
  🔴 [ALTA]: Consulta SQL construida con entrada del usuario
     src/api/promo.js:31
  🟡 [MEDIA]: El descuento puede superar el total
     src/checkout/applyPromo.js:58
  🔵 [BAJA]: Número mágico en la longitud máxima del código
     src/components/PromoInput.jsx:12
  Veredicto: cambios solicitados
  AskUserQuestion: [Publicar todo] [Publicar sin alguno] [No publicar]
  ```
- **Clave:** Un comentario lleva círculo y gravedad, título, descripción, fix sugerido y la firma «🤖 Generated by Tyr-skill».
- **Fuente:** skills/tyr/assets/comment.md; skills/tyr/SKILL.md · paso 8

#### 9. Dices que sí
- **Quién:** Tú → Tyr
- **Dónde:** conexión `tyr_h` al revés
- **Pantallas:** `chat-pr` → `answerYes`
- **Qué ocurre:** Eliges «Publicar todo». Es el sí a la vista previa: hasta aquí no se había publicado, aprobado ni pedido cambios en nada.
- **Fuente:** skills/tyr/SKILL.md · Hard Rules

#### 10. Tyr publica la revisión en una sola llamada
- **Quién:** Tyr → GitHub
- **Dónde:** conexión `tyr_gh`
- **Pantallas:** `pr-github` → `published`
- **Qué ocurre:** Los comentarios inline, el resumen y el veredicto van en una llamada a la API de revisiones, con el head SHA reseñado. Tyr no edita código, no hace push ni cierra la PR, y no da nada por publicado sin los ids que devuelve la plataforma.
- **Qué viaja:**
  ```
  gh api repos/org/repo/pulls/123/reviews --input review.json
  { "commit_id": "a1b2c3d…", "event": "REQUEST_CHANGES", "body": "## Revisión de Tyr · a1b2c3d …",
    "comments": [ { "path": "src/api/promo.js", "line": 31, "side": "RIGHT", "body": "🔴 [ALTA]: …" }, … ] }
  ← review id 7001 · 3 comentarios inline
  ```
- **Ojo:** En una PR propia GitHub no deja pedir cambios: Tyr usaría COMMENT y lo diría.
- **Fuente:** skills/tyr/references/platforms.md

#### 11. Tyr informa a Bifröst
- **Quién:** Tyr → Bifröst
- **Dónde:** conexión `bf_tyr` al revés
- **Qué ocurre:** Devuelve la PR, el veredicto, el recuento por gravedad y los ids publicados. Si algo no se pudo publicar, lo dice con el error literal.
- **Qué viaja:**
  ```
  PR: https://github.com/org/repo/pull/123 · GitHub · head a1b2c3d
  ALTA 1 · MEDIA 1 · BAJA 1 · re-revisión: n/a
  Veredicto aplicado: cambios solicitados · review 7001
  ```
- **Fuente:** skills/tyr/references/role.md · Handoff; skills/tyr/SKILL.md · Output Contract

#### 12. Bifröst entrega el resultado
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-pr` → `delivery`
- **Qué ocurre:** Cuenta qué se revisó, qué hizo cada lente, qué se publicó y qué queda: que el autor corrija. El siguiente paso posible (una re-revisión tras los cambios) no corre sin tu sí.
- **Qué viaja:**
  ```
  Qué se hizo: revisión de la PR #123 con 3 lentes; 3 comentarios inline y resumen publicados
  Qué queda: que el autor corrija la ALTA y la MEDIA
  Siguiente paso posible: re-revisar tras los cambios
  ```
- **Enlace:** [Detalle en ONBOARDING.md](../../ONBOARDING.md#3-cómo-decide-bifröst)

### ¿Y si…?

#### No das el sí (`no-publica`) · tras el paso 8

##### 1. Eliges «No publicar»
- **Quién:** Tú → Tyr
- **Dónde:** conexión `tyr_h` al revés
- **Pantallas:** `chat-pr` → `answerNo` · `pr-github` → `untouched`
- **Qué ocurre:** Sin un sí a la vista previa, Tyr no publica nada, no aprueba y no pide cambios. La revisión queda solo en tu conversación.
- **Fuente:** skills/tyr/SKILL.md · Hard Rules

##### 2. Tyr informa: no publicado
- **Quién:** Tyr → Bifröst
- **Dónde:** conexión `bf_tyr` al revés
- **Qué ocurre:** La salida indica el recuento por gravedad y «no publicado» con el motivo (tú decidiste no publicar). No hay ids porque no hay nada publicado.
- **Qué viaja:**
  ```
  ALTA 1 · MEDIA 1 · BAJA 1
  Veredicto aplicado: no publicado (el humano no dio el sí a la vista previa)
  ```
- **Fuente:** skills/tyr/SKILL.md · Output Contract

##### 3. Bifröst entrega y ofrece lo siguiente
- **Quién:** Bifröst → tú
- **Dónde:** conexión `bf_h`
- **Pantallas:** `chat-pr` → `deliveryNone`
- **Qué ocurre:** Cuenta que la revisión no se publicó y deja la decisión en tus manos, por ejemplo publicar sin algún comentario en otra ocasión. Tyr no publica por su cuenta más tarde.

### Bajo el escenario

#### Puntos clave
- **[Clave] Nada se publica sin tu sí:** Ni comentarios, ni aprobación, ni petición de cambios. La vista previa es la puerta.
- **[Clave] Tres lentes en paralelo:** Lógica, seguridad y calidad, cada una en un subagente con su brief. Solo revisan líneas añadidas o modificadas.
- **[Clave] El veredicto sale de la gravedad:** Una ALTA o MEDIA implica pedir cambios; solo BAJA o nada implica aprobar.
- **[Riesgo] Qué no hace Tyr:** No corrige el código (Brokkr), no valida contra una spec (Heimdall) y no abre ni mergea PRs (Forseti).

Además, bajo cada escenario aparecen las secciones de la vista (criterio plan mode u OpenSpec y tabla de intención a especialista), descritas en `PROJECT.md`.

---

## Abierto [?]

La misma lista que el mockup, «Abierto en este escenario».

1. ¿Entrega Bifröst el resultado al final o lo hace Tyr directamente? El rol de Tyr dice que informa a Bifröst; la entrega al humano sigue la regla general de Bifröst, pero no está escrita para Tyr en concreto.

## Acordado [A]

- En github.com se usa la CLI gh; en bitbucket.org, el MCP de Atlassian. [V]
- Los comentarios llevan el formato de assets/comment.md y la firma «🤖 Generated by Tyr-skill». [V]

## Glosario

Sin términos propios de este escenario: todos están en el glosario de `PROJECT.md`.

## Siguiente paso

1. Comprobar con un revisor habitual que la vista previa del mockup refleja lo que ve en Claude Code.
