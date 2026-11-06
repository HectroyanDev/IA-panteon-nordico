# Spec Delta

## Purpose

Decidir dónde se ejecuta cada especialista del panteón y con qué modelo, sin cambiar el modelo de la sesión y sin perder la posibilidad de preguntar al humano.

## ADDED Requirements

### Requirement: Especialistas en subagente con modelo propio
Hugin, Munin-mimir, Munin-memory, Skuld, Brokkr, Heimdall y Bragi SHALL ejecutarse en un subagente con el modelo fijado en su skill: Hugin `sonnet`, Munin-mimir `haiku`, Munin-memory `haiku`, Skuld `opus`, Brokkr `sonnet`, Heimdall `opus`, Bragi `sonnet`. Su ejecución MUST no cambiar el modelo de la sesión principal.

#### Scenario: Delegación de Bifröst
- **WHEN** Bifröst delega una exploración en Hugin en una sesión con otro modelo
- **THEN** Hugin se ejecuta en un subagente con `sonnet` y la sesión principal sigue con su modelo al terminar

#### Scenario: Invocación directa
- **WHEN** el humano escribe `/heimdall`
- **THEN** Heimdall se ejecuta en un subagente con `opus`

### Requirement: Especialistas interactivos en el hilo principal
Odín, Forseti y Hela SHALL ejecutarse en el hilo principal con el modelo de la sesión, sin fijar modelo, y MUST poder preguntar al humano con `AskUserQuestion`.

#### Scenario: Odín pregunta
- **WHEN** Bifröst carga a Odín con requisitos incompletos
- **THEN** Odín pregunta al humano con `AskUserQuestion` en la sesión principal y el modelo de la sesión no cambia

### Requirement: Preguntas a través de Bifröst
Un especialista en subagente SHALL no preguntar al humano directamente. Si le falta un dato bloqueante, MUST terminar y devolver a Bifröst las preguntas con opciones concretas; Bifröst MUST hacerlas con `AskUserQuestion` y volver a delegar con las respuestas.

#### Scenario: Falta el nombre del change
- **WHEN** Skuld se ejecuta en subagente sin nombre de change
- **THEN** devuelve a Bifröst una pregunta con 2–3 nombres candidatos, Bifröst la lanza al humano y vuelve a delegar en Skuld con el nombre elegido

### Requirement: Encargo completo al delegar
Al delegar en un especialista en subagente, Bifröst SHALL incluir en el encargo todo el contexto que necesita (objetivo, requisitos confirmados, rutas, nombre del change y decisiones previas), porque el subagente no ve la conversación.

#### Scenario: Implementación delegada
- **WHEN** Bifröst delega en Brokkr la implementación de un change
- **THEN** el encargo incluye el nombre del change y las decisiones tomadas en la conversación que no estén en los artefactos
