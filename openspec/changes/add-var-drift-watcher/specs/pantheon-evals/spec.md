# Spec Delta

## ADDED Requirements

### Requirement: Casos de Vár
La suite SHALL incluir dos casos de `/var`: uno sin plan activo, que pasa solo si Vár dice que no hay plan que vigilar, y otro con un plan y un resumen de trabajo fuera de él en el encargo, que pasa solo si devuelve `desvío` con el paso del plan afectado. Ninguno de los dos MUST usar `Write` ni `Edit`.

#### Scenario: Sin plan
- **WHEN** se ejecuta el caso de Vár sin plan en el encargo ni plan activo
- **THEN** la respuesta dice que no hay plan que vigilar y no se usó `Write` ni `Edit`

#### Scenario: Desvío claro
- **WHEN** se ejecuta el caso de Vár con un plan de tres pasos y un resumen de trabajo sobre un módulo que el plan no menciona
- **THEN** la respuesta contiene el veredicto `desvío`, nombra el paso del plan que tocaba y no se usó `Write` ni `Edit`
