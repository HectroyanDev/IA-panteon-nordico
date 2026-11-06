# Spec Delta

## MODIFIED Requirements

### Requirement: Especialistas en subagente con modelo propio
Hugin, Hugin-graphify, Munin-mimir, Munin-memory, Skuld, Brokkr, Heimdall y Bragi SHALL ejecutarse en un subagente con el modelo fijado en su skill: Hugin `sonnet`, Hugin-graphify `sonnet`, Munin-mimir `haiku`, Munin-memory `haiku`, Skuld `opus`, Brokkr `sonnet`, Heimdall `opus`, Bragi `sonnet`. Su ejecución MUST no cambiar el modelo de la sesión principal.

#### Scenario: Delegación de Bifröst
- **WHEN** Bifröst delega una exploración en Hugin en una sesión con otro modelo
- **THEN** Hugin se ejecuta en un subagente con `sonnet` y la sesión principal sigue con su modelo al terminar

#### Scenario: Invocación directa
- **WHEN** el humano escribe `/heimdall`
- **THEN** Heimdall se ejecuta en un subagente con `opus`

#### Scenario: Hugin-graphify en subagente
- **WHEN** el humano escribe `/hugin-graphify` o Bifröst delega en `nordic-pantheon:hugin-graphify`
- **THEN** se ejecuta en un subagente con `sonnet`, sin `AskUserQuestion`, y la sesión principal sigue con su modelo al terminar
