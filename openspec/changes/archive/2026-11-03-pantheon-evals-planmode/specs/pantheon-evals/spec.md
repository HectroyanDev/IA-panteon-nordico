# Spec Delta

## Purpose
Comprobar con `claude plugin eval` que Bifröst y los especialistas del panteón mantienen sus reglas de comportamiento (preguntar en vez de presuponer, no encadenar fases, devolver preguntas desde subagente, no inventar) tras cada cambio en sus instrucciones.

## ADDED Requirements

### Requirement: Suite de evals en el plugin
El repo SHALL incluir en `evals/` una suite que `claude plugin eval` ejecuta contra el plugin `nordic-pantheon`, con un directorio por caso (`prompt.md` o `case.yaml` más `graders/*.md`).

#### Scenario: Suite detectable
- **WHEN** el humano ejecuta `tests/evals.sh` en la raíz del repo
- **THEN** `claude plugin eval` encuentra los casos de `evals/` y muestra un resultado por caso

### Requirement: Caso de Odín con requisitos incompletos
La suite SHALL incluir un caso en el que Odín recibe una petición no trivial sin quién, por qué ni criterio de hecho, y que pasa solo si Odín pregunta (en el sandbox de `claude plugin eval` `AskUserQuestion` no existe, así que pregunta en texto, con lo desconocido explícito), no escribe archivos y no propone implementar ni planificar.

#### Scenario: Odín pregunta
- **WHEN** se ejecuta el caso de Odín
- **THEN** los graders comprueban que la respuesta contiene una pregunta con lo desconocido explícito, que no se usó `Write` ni `Edit` y que la respuesta no propone implementar, ni invoca `/opsx:propose` ni a Brokkr

### Requirement: Casos de Bifröst
La suite SHALL incluir casos en los que Bifröst se activa con `/bifrost` (el sandbox no carga el `CLAUDE.md` del usuario) y que pasan solo si Bifröst clasifica la petición, delega en el mínimo de especialistas y no encadena fases sin que la petición lo pida.

#### Scenario: Anti-waterfall
- **WHEN** se ejecuta un caso que pide con `/bifrost` una feature con requisitos incompletos
- **THEN** los graders comprueban que Bifröst carga a Odín y no carga a Skuld, Brokkr, Heimdall ni Hela en esa ejecución

#### Scenario: Cambio pequeño a plan mode
- **WHEN** se ejecuta un caso que pide con `/bifrost` un refactor sin comportamiento nuevo
- **THEN** los graders comprueban que Bifröst elige el camino plan mode y no carga a Skuld ni `/opsx:propose`

### Requirement: Casos de especialistas en subagente
La suite SHALL incluir un caso de Skuld sin nombre de change y uno de Brokkr sin change que implementar, que pasan solo si el especialista termina devolviendo la pregunta con opciones concretas, sin crear artefactos ni escribir código.

#### Scenario: Skuld sin nombre
- **WHEN** se ejecuta el caso de Skuld con requisitos confirmados y sin nombre de change
- **THEN** la respuesta contiene una pregunta con 2–3 nombres kebab-case candidatos y no existe ningún directorio bajo `openspec/changes/` creado por la ejecución

#### Scenario: Brokkr sin change
- **WHEN** se ejecuta el caso de Brokkr sin nombre de change ni plan
- **THEN** la respuesta devuelve la pregunta a Bifröst y no se usó `Write` ni `Edit`

### Requirement: Caso de Munin-mimir con memoria vacía
La suite SHALL incluir un caso en el que Munin-mimir busca un recuerdo contra un Mimir simulado que no devuelve nada (mocks en `evals/mocks/<server>/<tool>.md`), y que pasa solo si responde que no hay recuerdos sin inventar contenido.

#### Scenario: Mimir vacío
- **WHEN** se ejecuta el caso de Munin-mimir con los mocks de Mimir vacíos
- **THEN** la respuesta dice que no hay recuerdos sobre el tema y no afirma decisiones ni fechas que no estén en el prompt

### Requirement: Caso de Hugin-graphify sin grafo
La suite SHALL incluir un caso en el que Hugin-graphify explora un directorio sin `graphify-out/` y que pasa solo si devuelve la pregunta de construir el grafo (o avisa de que graphify no está disponible) sin construirlo. El caso MUST limitar `Bash` a comprobaciones de solo lectura.

#### Scenario: Sin grafo
- **WHEN** se ejecuta el caso de Hugin-graphify sin `graphify-out/` y sin `Construir grafo: sí`
- **THEN** no existe `graphify-out/` al terminar y la respuesta contiene la pregunta de construir el grafo o el aviso de CLI ausente

#### Scenario: Bash acotado
- **WHEN** el agente del caso intenta un comando `Bash` fuera de la lista de solo lectura, como `graphify extract`
- **THEN** la herramienta lo rechaza

### Requirement: Graders deterministas primero
Cada caso SHALL usar graders deterministas (`regex`, `tool_used`, `tool_order`, `file_exists`) para lo que se pueda comprobar así, y MUST usar un grader `llm` con el modelo juez por defecto (haiku) solo para criterios que no admitan comprobación determinista.

#### Scenario: Revisión de graders
- **WHEN** se revisan los graders de la suite
- **THEN** cada grader `llm` tiene en su cuerpo el motivo por el que no basta uno determinista

### Requirement: Script de ejecución sin publicar y con tope
El repo SHALL incluir `tests/evals.sh`, que ejecuta la suite siempre con `--no-publish` y `--max-cost-usd 2`, con una ejecución por caso por defecto, y MUST devolver el código de salida de `claude plugin eval`.

#### Scenario: Ejecución por defecto
- **WHEN** el humano ejecuta `tests/evals.sh` sin flags
- **THEN** se llama a `claude plugin eval` con `--no-publish`, `--max-cost-usd 2` y `--runs 1`

#### Scenario: Más ejecuciones
- **WHEN** el humano ejecuta `tests/evals.sh --runs 3`
- **THEN** se llama a `claude plugin eval` con `--runs 3`, `--no-publish` y `--max-cost-usd 2`

#### Scenario: Tope y publicación no modificables
- **WHEN** el humano pasa a `tests/evals.sh` un flag que no reconoce, como `--publish-report` o `--max-cost-usd 10`
- **THEN** el script muestra la ayuda y sale con código distinto de cero sin llamar a `claude`

#### Scenario: Tope alcanzado
- **WHEN** `claude plugin eval` sale con código 2 porque se alcanzó el tope
- **THEN** `tests/evals.sh` sale con código 2

### Requirement: Evals fuera del instalador
`install.sh` SHALL no ejecutar la suite de evals ni `tests/evals.sh` en ninguno de sus subcomandos.

#### Scenario: Instalar sin coste de evals
- **WHEN** el humano ejecuta `./install.sh install --yes`
- **THEN** no se llama a `claude plugin eval`

### Requirement: Resultados fuera del control de versiones
Los resultados de las ejecuciones (`evals/results/`) SHALL quedar en disco local y MUST estar listados en el `.gitignore` de la raíz.

#### Scenario: Resultados ignorados
- **WHEN** termina una ejecución de `tests/evals.sh`
- **THEN** el informe está bajo `evals/results/` y `.gitignore` contiene `evals/results/`
