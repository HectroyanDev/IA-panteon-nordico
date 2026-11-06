# Spec Delta

## Purpose
Dar al panteón un camino ligero para cambios que no añaden ni modifican comportamiento que merezca spec (ajustes, refactors, arreglos), con plan escrito, aprobación explícita del humano, implementación y validación, sin el coste de los artefactos OpenSpec.

## ADDED Requirements

### Requirement: Elección entre plan mode y OpenSpec
Ante un cambio no mecánico, Bifröst SHALL elegir el camino plan mode si el cambio no añade ni modifica comportamiento que merezca spec (ajuste, refactor, arreglo) y el camino OpenSpec si lo hace. Las tareas mecánicas MUST seguir resolviéndose inline.

#### Scenario: Refactor
- **WHEN** el humano pide a Bifröst extraer una función repetida sin cambiar su comportamiento
- **THEN** Bifröst elige el camino plan mode y no invoca a Skuld

#### Scenario: Feature nueva
- **WHEN** el humano pide a Bifröst un flag nuevo del instalador
- **THEN** Bifröst sigue el camino OpenSpec como hasta ahora

#### Scenario: Duda
- **WHEN** Bifröst no puede decidir si el cambio altera comportamiento especificado
- **THEN** pregunta al humano qué camino seguir con `AskUserQuestion` antes de entrar en plan mode o delegar en Skuld

### Requirement: Entrada en plan mode con permiso
En el camino plan mode, Bifröst SHALL entrar en plan mode con `EnterPlanMode`, que pide permiso al humano. Si el humano lo rechaza, Bifröst MUST parar y no editar archivos.

#### Scenario: Humano acepta
- **WHEN** Bifröst llama a `EnterPlanMode` y el humano lo acepta
- **THEN** la sesión queda en plan mode y Bifröst carga a Odín

#### Scenario: Humano rechaza
- **WHEN** el humano rechaza entrar en plan mode
- **THEN** Bifröst para, no edita archivos y ofrece el camino OpenSpec o dejarlo

### Requirement: Plan escrito por Odín
Dentro de plan mode, Odín SHALL preguntar con `AskUserQuestion` solo lo que falte y escribir el plan en el archivo de plan que indica plan mode, con las secciones Requisitos, Enfoque, Pasos y Verificación.

#### Scenario: Plan completo
- **WHEN** Odín termina de elicitar en plan mode
- **THEN** el archivo de plan contiene las secciones Requisitos, Enfoque, Pasos y Verificación, y cada paso dice cómo se comprueba

#### Scenario: Datos del código
- **WHEN** Odín necesita hechos del código para el enfoque
- **THEN** pide a Bifröst que delegue en Hugin y no explora por su cuenta

### Requirement: Aprobación con ExitPlanMode
Bifröst SHALL presentar el plan con `ExitPlanMode`. Su aprobación MUST contar como el sí explícito del humano y sustituye la confirmación `Sí, confirmo` de Odín; sin aprobación no se implementa.

#### Scenario: Plan aprobado
- **WHEN** el humano aprueba el plan en `ExitPlanMode`
- **THEN** Bifröst delega en Brokkr sin pedir otra confirmación de requisitos

#### Scenario: Plan rechazado o con cambios
- **WHEN** el humano rechaza el plan o pide cambios
- **THEN** la sesión sigue en plan mode, Odín ajusta el plan y no se delega en Brokkr

### Requirement: Implementación desde el plan
En el camino plan mode, Brokkr SHALL implementar los pasos del plan aprobado a partir de la ruta y el contenido recibidos en el encargo, sin `tasks.md` ni `/opsx:apply`, y MUST no modificar el archivo de plan.

#### Scenario: Encargo con plan
- **WHEN** Bifröst delega en Brokkr con la ruta y el contenido de un plan aprobado
- **THEN** Brokkr implementa sus pasos y devuelve qué pasos hizo, qué archivos cambió y los bloqueos

#### Scenario: Plan ambiguo
- **WHEN** un paso del plan no se puede implementar sin decidir algo que el plan no dice
- **THEN** Brokkr para y devuelve a Bifröst la pregunta con opciones concretas

### Requirement: Validación contra el plan
En el camino plan mode, Heimdall SHALL validar la implementación contra los pasos y la sección Verificación del plan, sin `/opsx:verify`, y MUST informar con severidades CRITICAL, WARNING y SUGGESTION.

#### Scenario: Validación aprobada
- **WHEN** todas las comprobaciones de Verificación del plan pasan
- **THEN** Heimdall informa a Bifröst del resultado y no propone a Hela

#### Scenario: Paso sin cumplir
- **WHEN** un paso del plan no está implementado o una comprobación falla
- **THEN** Heimdall lo informa como CRITICAL y Bifröst puede volver a delegar en Brokkr

### Requirement: Sin artefactos OpenSpec en plan mode
El camino plan mode SHALL no crear ni modificar nada bajo `openspec/` ni invocar a Skuld ni a Hela.

#### Scenario: Cambio recorrido entero
- **WHEN** un cambio recorre plan, aprobación, Brokkr y Heimdall
- **THEN** `openspec/` queda igual que antes de empezar
