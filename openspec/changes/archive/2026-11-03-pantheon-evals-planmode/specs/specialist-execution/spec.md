# Spec Delta

## MODIFIED Requirements

### Requirement: Encargo completo al delegar
Al delegar en un especialista en subagente, Bifröst SHALL incluir en el encargo todo el contexto que necesita (objetivo, requisitos confirmados, rutas, nombre del change o, en el camino plan mode, ruta y contenido del plan aprobado, y decisiones previas), porque el subagente no ve la conversación.

#### Scenario: Implementación delegada
- **WHEN** Bifröst delega en Brokkr la implementación de un change
- **THEN** el encargo incluye el nombre del change y las decisiones tomadas en la conversación que no estén en los artefactos

#### Scenario: Implementación desde un plan
- **WHEN** Bifröst delega en Brokkr o Heimdall un trabajo del camino plan mode
- **THEN** el encargo incluye la ruta del archivo de plan, su contenido completo y las decisiones de la conversación que no estén en el plan
