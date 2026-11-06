# hugin-exploration-backends Specification

## Purpose
Dar a Hugin dos backends de exploración intercambiables, lectura directa del código o consulta de un grafo local de graphify, para recortar el coste de explorar sin que el resto del panteón dependa de cuál esté activo.

## Requirements

### Requirement: Hugin sobre el grafo de graphify
El plugin SHALL incluir la skill `nordic-pantheon:hugin-graphify`, hermana de `nordic-pantheon:hugin`, que responde preguntas sobre el código consultando el grafo de graphify del repo (`graphify query`, `graphify path`, `graphify explain`) y lee código solo donde el grafo no basta. La skill `nordic-pantheon:hugin` MUST quedar sin cambios.

#### Scenario: Pregunta de estructura respondida por el grafo
- **WHEN** se invoca `hugin-graphify` con la pregunta "¿quién llama a `config_write`?" en un repo con `graphify-out/`
- **THEN** responde a partir de `graphify query`, `graphify path` o `graphify explain` y su brief indica qué parte sale del grafo y qué parte de leer código

#### Scenario: Hugin actual intacto
- **WHEN** se compara `skills/hugin/` antes y después del change
- **THEN** no hay diferencias

### Requirement: Grafo refrescado antes de consultar
Con un grafo existente, `hugin-graphify` SHALL ejecutar `graphify update .` en la raíz del repo antes de la primera consulta de cada invocación. Si el refresco falla, MUST avisar en el brief de que el grafo puede estar desfasado y seguir con el grafo existente.

#### Scenario: Refresco previo
- **WHEN** se invoca `hugin-graphify` en un repo con `graphify-out/`
- **THEN** ejecuta `graphify update .` antes de cualquier `graphify query`, `path` o `explain`

#### Scenario: Refresco fallido
- **WHEN** `graphify update .` termina con código distinto de cero
- **THEN** el brief avisa de que el grafo puede estar desfasado y la exploración continúa con el grafo existente

### Requirement: Respuesta según el código de salida de la consulta
`hugin-graphify` SHALL interpretar el código de salida de `graphify query`, `path` y `explain`: 0 es respuesta válida; 3 (nombre ambiguo) MUST llevar a repetir con un nombre más específico entre los candidatos; 4 (sin coincidencia) MUST llevar a buscar en el código como Hugin normal.

#### Scenario: Nombre ambiguo
- **WHEN** `graphify explain Config` sale con código 3
- **THEN** `hugin-graphify` repite la consulta con un nombre más específico y no da por buena la primera salida

#### Scenario: Sin coincidencia en el grafo
- **WHEN** `graphify query` sale con código 4
- **THEN** `hugin-graphify` busca la respuesta leyendo el código y lo indica en el brief

### Requirement: Construcción del grafo solo con permiso
En un repo sin `graphify-out/`, `hugin-graphify` SHALL no construir el grafo por su cuenta: MUST explorar como Hugin normal y devolver a Bifröst, junto al brief, la pregunta de si construirlo con `graphify extract --code-only` (local, sin LLM ni coste). Solo con un sí del humano en el encargo MUST construirlo antes de consultar.

#### Scenario: Repo sin grafo
- **WHEN** se invoca `hugin-graphify` en un repo sin `graphify-out/` y el encargo no autoriza construirlo
- **THEN** no ejecuta `graphify extract`, responde explorando el código y devuelve a Bifröst la pregunta de si construir el grafo con opciones concretas

#### Scenario: Construcción autorizada
- **WHEN** Bifröst vuelve a delegar con el sí del humano a construir el grafo
- **THEN** `hugin-graphify` ejecuta `graphify extract --code-only` en la raíz del repo y responde consultando el grafo

### Requirement: graphify-out fuera de git
Al construir el grafo por primera vez en un repo git, `hugin-graphify` SHALL añadir `graphify-out/` al `.gitignore` de la raíz del repo si git no lo ignora ya. En un directorio que no es repo git MUST no crear ni modificar `.gitignore`.

#### Scenario: Repo git sin la entrada
- **WHEN** se construye el grafo en un repo git cuyo `.gitignore` no ignora `graphify-out/`
- **THEN** `.gitignore` gana la línea `graphify-out/` y `git status` no muestra `graphify-out/`

#### Scenario: Ya ignorado
- **WHEN** se construye el grafo en un repo git que ya ignora `graphify-out/`
- **THEN** `.gitignore` no cambia

#### Scenario: Directorio sin git
- **WHEN** se construye el grafo en un directorio que no es repo git
- **THEN** no se crea ni se modifica ningún `.gitignore`

### Requirement: Degradación sin la CLI graphify
Si la CLI `graphify` no está en el `PATH` al ejecutarse, `hugin-graphify` SHALL avisar en el brief de que falta y explorar como Hugin normal, sin intentar instalarla.

#### Scenario: CLI ausente
- **WHEN** se invoca `hugin-graphify` y `command -v graphify` falla
- **THEN** el brief avisa de que graphify no está disponible, la exploración se hace leyendo código y no se ejecuta ningún instalador

### Requirement: Selección del backend de Hugin
Bifröst SHALL delegar la exploración en la skill que indique `HUGIN_BACKEND` en la config del panteón (`plain` → `nordic-pantheon:hugin`, `graphify` → `nordic-pantheon:hugin-graphify`). Sin config, sin esa clave o con un valor desconocido, MUST usar `nordic-pantheon:hugin`.

#### Scenario: Backend graphify configurado
- **WHEN** la config indica `HUGIN_BACKEND=graphify` y Bifröst necesita explorar el código
- **THEN** carga `nordic-pantheon:hugin-graphify`

#### Scenario: Sin config
- **WHEN** no existe la config del panteón y Bifröst necesita explorar el código
- **THEN** carga `nordic-pantheon:hugin`

### Requirement: Pregunta de construcción relanzada por Bifröst
Cuando `hugin-graphify` devuelve la pregunta de construir el grafo, Bifröst SHALL hacerla al humano y, con un sí, volver a delegar en `hugin-graphify` con el encargo original y la autorización de construir. Con un no, MUST quedarse con el brief ya devuelto.

#### Scenario: Humano acepta construir
- **WHEN** `hugin-graphify` devuelve la pregunta de construir el grafo y el humano responde que sí
- **THEN** Bifröst vuelve a delegar en `hugin-graphify` con el encargo y la autorización, y entrega el brief basado en el grafo

#### Scenario: Humano rechaza construir
- **WHEN** el humano responde que no
- **THEN** Bifröst entrega el brief de la exploración sin grafo y no vuelve a delegar
