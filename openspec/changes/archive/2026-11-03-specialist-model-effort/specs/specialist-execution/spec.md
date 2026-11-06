# Spec Delta

## MODIFIED Requirements

### Requirement: Especialistas en subagente con modelo propio
Hugin, Hugin-graphify, Munin-mimir, Munin-memory, Skuld, Brokkr, Heimdall y Bragi SHALL ejecutarse en un subagente con el modelo y el esfuerzo fijados en su skill: Hugin `sonnet`/`medium`, Hugin-graphify `sonnet`/`low`, Munin-mimir `haiku`/`low`, Munin-memory `haiku`/`low`, Skuld `opus`/`high`, Brokkr `sonnet`/`medium`, Heimdall `opus`/`high`, Bragi `sonnet`/`medium`. Su ejecución MUST no cambiar el modelo ni el esfuerzo de la sesión principal.

#### Scenario: Delegación de Bifröst
- **WHEN** Bifröst delega una exploración en Hugin en una sesión con otro modelo
- **THEN** Hugin se ejecuta en un subagente con `sonnet` y esfuerzo `medium`, y la sesión principal sigue con su modelo y su esfuerzo al terminar

#### Scenario: Invocación directa
- **WHEN** el humano escribe `/heimdall`
- **THEN** Heimdall se ejecuta en un subagente con `opus` y esfuerzo `high`

#### Scenario: Hugin-graphify en subagente
- **WHEN** el humano escribe `/hugin-graphify` o Bifröst delega en `nordic-pantheon:hugin-graphify`
- **THEN** se ejecuta en un subagente con `sonnet` y esfuerzo `low`, sin `AskUserQuestion`, y la sesión principal sigue con su modelo al terminar

### Requirement: Especialistas interactivos en el hilo principal
Odín, Forseti y Hela SHALL ejecutarse en el hilo principal con el modelo y el esfuerzo fijados en su skill: Odín `opus`/`high`, Forseti `sonnet`/`medium`, Hela `sonnet`/`medium`, y MUST poder preguntar al humano con `AskUserQuestion`. Su modelo MUST regir desde que se carga la skill hasta el final del turno, y la sesión MUST recuperar su modelo con el siguiente mensaje del humano, sin guardar el cambio en la configuración.

#### Scenario: Odín pregunta
- **WHEN** Bifröst carga a Odín con requisitos incompletos en una sesión con `sonnet`
- **THEN** Odín se ejecuta con `opus` y esfuerzo `high` en la sesión principal y pregunta al humano con `AskUserQuestion`

#### Scenario: Vuelta al modelo de la sesión
- **WHEN** el humano responde a la pregunta de Odín con un mensaje nuevo
- **THEN** ese turno empieza con el modelo de la sesión, no con `opus`

#### Scenario: Arrastre tras Hela o Forseti
- **WHEN** Bifröst carga a Hela o a Forseti y sigue trabajando en el mismo turno
- **THEN** el resto del turno usa `sonnet`, nunca un modelo inferior

## ADDED Requirements

### Requirement: Modelo y esfuerzo de Bifröst
La skill `/bifrost` SHALL fijar modelo `opus` y esfuerzo `high`, con la misma regla de duración que los especialistas del hilo principal. Bifröst global (`~/.claude/CLAUDE.md`) SHALL usar el modelo y el esfuerzo de la sesión, porque un `CLAUDE.md` no los fija.

#### Scenario: Bifröst bajo demanda
- **WHEN** el humano escribe `/bifrost` con una petición en una sesión con `sonnet`
- **THEN** ese turno se atiende con `opus` y esfuerzo `high`, y el siguiente mensaje del humano vuelve a `sonnet`

#### Scenario: Bifröst global
- **WHEN** `~/.claude/CLAUDE.md` apunta a `bifrost/CLAUDE.md` y el humano escribe una petición sin `/bifrost`
- **THEN** Bifröst se atiende con el modelo y el esfuerzo de la sesión
