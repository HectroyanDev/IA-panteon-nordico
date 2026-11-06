# Spec Delta

## Purpose

Vigilar en segundo plano que el trabajo en curso (hilo principal y subagentes) no se desvíe del plan aprobado, reconducirlo a tiempo sin parar al humano y mostrarle qué se desvió y qué se corrigió. Lo hace Vár, especialista del panteón.

## ADDED Requirements

### Requirement: Vár en el panteón
El plugin SHALL incluir la skill `nordic-pantheon:var`, con `SKILL.md` y `references/role.md` como el resto de especialistas, que define el contrato del juicio de alineación. La vigilancia automática MUST correr en segundo plano sin que Bifröst la lance (salvo que esté desactivada, ver "Activación configurable"), y `/var` MUST hacer una comprobación puntual contra el plan activo que informa del veredicto y, si es `desvío`, corrige igual que la vigilancia automática.

#### Scenario: Skill presente
- **WHEN** se lista `skills/var/` en el repo
- **THEN** existen `SKILL.md` y `references/role.md`

#### Scenario: Comprobación manual sin plan
- **WHEN** el humano escribe `/var` y no hay plan activo
- **THEN** Vár responde que no hay plan que vigilar, sin editar archivos

#### Scenario: Comprobación manual con plan
- **WHEN** el humano escribe `/var` con un plan activo
- **THEN** Vár devuelve el veredicto de alineación del trabajo hecho hasta ahora contra ese plan, sin editar archivos

#### Scenario: Comprobación manual con desvío
- **WHEN** el humano escribe `/var` con un plan activo y el veredicto de un hilo es `desvío`
- **THEN** Vár informa del veredicto y ese hilo recibe la misma corrección que enviaría la vigilancia automática, que queda registrada, aparece en el panel y genera una notificación

### Requirement: Activación configurable
Vár SHALL leer `VAR_ENABLED` (`on` u `off`) de `${XDG_CONFIG_HOME:-$HOME/.config}/nordic-pantheon/config` al activar cada plan. Sin config, sin la clave o con otro valor, MUST tomar `on`. Con `off`, la vigilancia automática MUST no activarse: no cuenta, no juzga, no abre el panel ni notifica por su cuenta. `/var` MUST seguir funcionando con `off`, informando y corrigiendo, porque el humano lo pide de forma explícita.

#### Scenario: Vigilancia desactivada
- **WHEN** la config indica `VAR_ENABLED=off` y se aprueba un plan
- **THEN** no se lanza ningún juicio automático por muchas llamadas o minutos que pasen y el panel no se abre solo

#### Scenario: `/var` con vigilancia desactivada
- **WHEN** la config indica `VAR_ENABLED=off`, hay un plan aprobado y el humano escribe `/var`
- **THEN** Vár juzga contra ese plan y, si hay `desvío`, envía la corrección como con `on`

#### Scenario: Valor de activación no válido
- **WHEN** la config indica `VAR_ENABLED=quizá`
- **THEN** Vár toma `on`

### Requirement: Plan activo en el camino plan mode
Cuando el humano aprueba un plan con `ExitPlanMode`, Vár SHALL tomar como plan activo el archivo de plan aprobado y empezar a vigilar desde ese momento. Un plan rechazado MUST no activar nada; un plan aprobado después MUST sustituir al anterior.

#### Scenario: Plan aprobado
- **WHEN** `ExitPlanMode` termina con el plan aprobado
- **THEN** Vár registra ese archivo de plan como activo y pone a cero sus contadores

#### Scenario: Plan rechazado
- **WHEN** el humano rechaza el plan en `ExitPlanMode`
- **THEN** no hay plan activo y no se cuenta nada

### Requirement: Plan activo en el camino OpenSpec
Cuando empieza la implementación de un change OpenSpec (Brokkr o `/opsx:apply` con un change identificable), Vár SHALL tomar como plan activo el `tasks.md` de ese change, junto con su `proposal.md` y `design.md` como contexto. Si no puede identificar un único change, MUST no activarse.

#### Scenario: Implementación de un change
- **WHEN** Bifröst carga a Brokkr para el change `add-foo`
- **THEN** el plan activo es `openspec/changes/add-foo/tasks.md`

#### Scenario: Change ambiguo
- **WHEN** empieza una implementación sin nombre de change y hay más de un change activo
- **THEN** Vár no activa la vigilancia y lo deja anotado en el panel

### Requirement: Fin de la vigilancia
La vigilancia SHALL terminar cuando empieza la validación (Heimdall o `/opsx:verify`), cuando se archiva el change, cuando todas las tareas del `tasks.md` vigilado están marcadas, cuando se aprueba otro plan o cuando termina la sesión.

#### Scenario: Llega Heimdall
- **WHEN** Bifröst carga a Heimdall con un plan vigilado
- **THEN** Vár deja de contar y de juzgar, y el panel muestra la vigilancia como cerrada

### Requirement: Disparo por umbral
Con un plan activo y la vigilancia activada, Vár SHALL lanzar un juicio cuando, desde la activación o desde el último juicio (automático o de `/var`), pasen `VAR_MINUTES` minutos o se hagan `VAR_TOOL_CALLS` llamadas a herramientas, lo que llegue antes. Cuentan las llamadas del hilo principal y de todos sus subagentes, salvo las del propio `/var`. Tras cada juicio la ventana MUST empezar de nuevo.

#### Scenario: Tarea corta
- **WHEN** una tarea con plan activo termina en 6 minutos y 25 llamadas con los umbrales por defecto
- **THEN** no se lanza ningún juicio

#### Scenario: Gana el contador de llamadas
- **WHEN** se hacen 40 llamadas en 4 minutos con los umbrales por defecto
- **THEN** se lanza un juicio y la siguiente ventana empieza en ese momento

#### Scenario: Gana el tiempo
- **WHEN** pasan 10 minutos con 12 llamadas con los umbrales por defecto
- **THEN** se lanza un juicio y la siguiente ventana empieza en ese momento

#### Scenario: Sin plan activo
- **WHEN** una sesión trabaja 30 minutos y 200 llamadas sin plan aprobado ni change en implementación
- **THEN** Vár no lanza ningún juicio

### Requirement: Umbrales configurables
Vár SHALL leer `VAR_MINUTES` y `VAR_TOOL_CALLS` de `${XDG_CONFIG_HOME:-$HOME/.config}/nordic-pantheon/config` al activar cada plan. Sin config, sin la clave o con un valor que no sea un entero positivo, MUST usar 10 y 40 y anotarlo en el panel.

#### Scenario: Umbral cambiado
- **WHEN** la config indica `VAR_TOOL_CALLS=20` y se activa un plan
- **THEN** el primer juicio se lanza a las 20 llamadas si no han pasado antes `VAR_MINUTES` minutos

#### Scenario: Valor no válido
- **WHEN** la config indica `VAR_MINUTES=diez`
- **THEN** Vár usa 10 minutos y el panel lo indica

### Requirement: Juicio de alineación
Cada juicio SHALL comparar, con el modelo `opus` y esfuerzo `high`, el plan activo con lo hecho en la ventana por cada hilo con actividad (herramientas, archivos tocados, mensajes), y MUST devolver por hilo un veredicto `alineado`, `menor` o `desvío` con el paso del plan afectado y el motivo. Solo juzga alineación con el plan, no calidad ni corrección del código.

#### Scenario: Trabajo alineado
- **WHEN** Brokkr edita los archivos que nombra la tarea en curso del plan
- **THEN** el veredicto de su hilo es `alineado` y no se inyecta nada

#### Scenario: Trabajo fuera del plan
- **WHEN** Brokkr pasa la ventana refactorizando un módulo que ningún paso del plan menciona
- **THEN** el veredicto de su hilo es `desvío`, con el paso que debería estar haciendo y el motivo

#### Scenario: Bug no es desvío
- **WHEN** el trabajo sigue el paso del plan pero el código tiene un error
- **THEN** el veredicto no es `desvío` por ese error

### Requirement: Reconducción sin esperar al humano
Ante un veredicto `desvío`, venga de la vigilancia automática o de `/var`, Vár SHALL inyectar en el hilo que se desvió (principal o subagente en curso) una corrección con el paso del plan que toca y lo que debe dejar de hacer, sin preguntar ni esperar al humano. Un veredicto `menor` MUST solo registrarse. Un hilo MUST recibir como mucho una corrección por ventana aunque coincidan un juicio automático y uno de `/var`.

#### Scenario: Desvío en un subagente
- **WHEN** el juicio marca `desvío` en el subagente de Brokkr mientras sigue trabajando
- **THEN** ese subagente recibe la corrección antes de su siguiente paso y el hilo principal no se interrumpe

#### Scenario: Desvío en el hilo principal
- **WHEN** el juicio marca `desvío` en el hilo principal
- **THEN** el hilo principal recibe la corrección antes de su siguiente paso

#### Scenario: Subagente ya terminado
- **WHEN** el hilo que se desvió ya terminó cuando llega el veredicto
- **THEN** la corrección se inyecta en el hilo principal indicando qué subagente se desvió

#### Scenario: Desvío detectado con `/var`
- **WHEN** `/var` marca `desvío` en el subagente de Brokkr mientras sigue trabajando
- **THEN** ese subagente recibe la corrección por la misma vía y con la misma plantilla que en la vigilancia automática

### Requirement: Límite de correcciones
Si un mismo hilo recibe dos correcciones y el juicio siguiente vuelve a marcar `desvío`, Vár SHALL dejar de inyectar correcciones en ese hilo, marcarlo como desvío persistente en el panel y notificar al humano. Las correcciones y los juicios de `/var` MUST contar para este límite igual que los automáticos.

#### Scenario: Desvío persistente
- **WHEN** el subagente de Brokkr acumula un tercer veredicto `desvío` tras dos correcciones
- **THEN** no recibe una tercera corrección, el panel lo marca como persistente y el humano recibe una notificación

#### Scenario: `/var` tras dos correcciones automáticas
- **WHEN** un hilo ya recibió dos correcciones automáticas y `/var` vuelve a marcar `desvío` en él
- **THEN** no recibe una tercera corrección y queda marcado como persistente

### Requirement: Las correcciones no amplían el encargo
Una corrección de Vár SHALL limitarse a recordar el plan aprobado: no añade pasos, no cambia requisitos y no autoriza acciones que el plan no recoja. Bifröst y los especialistas MUST tratarla así y seguir pidiendo permiso al humano para lo que el plan no cubra.

#### Scenario: Corrección recibida
- **WHEN** Brokkr recibe una corrección de Vár
- **THEN** vuelve al paso del plan indicado y no toma la corrección como permiso para nada fuera del plan

### Requirement: Registro de juicios
Cada juicio, automático o de `/var`, SHALL quedar registrado en la sesión con la hora, el origen (automático o `/var`), el hilo, el veredicto, el paso del plan, el motivo y, si la hubo, la corrección enviada. Cada corrección MUST dejar además un aviso visible en la transcripción.

#### Scenario: Corrección registrada
- **WHEN** Vár envía una corrección
- **THEN** el registro tiene la entrada con la corrección y la transcripción muestra un aviso de Vár

### Requirement: Panel lateral
En la app de escritorio, Vár SHALL mostrar un panel lateral con el plan vigilado, los contadores de la ventana actual, los umbrales, si la vigilancia automática está activada y el registro de juicios, con cada desvío y su corrección destacados. El panel MUST poder abrirse a mano y abrirse solo al activarse un plan con la vigilancia activada.

#### Scenario: Plan activado
- **WHEN** se aprueba un plan en la app de escritorio
- **THEN** se abre el panel de Vár con el plan y los contadores a cero

#### Scenario: Desvío visible
- **WHEN** un juicio marca `desvío`
- **THEN** el panel muestra qué hilo se desvió, del paso de qué plan y qué corrección se envió

### Requirement: Notificación de desvío
Cada veredicto `desvío` y cada desvío persistente, automático o de `/var`, SHALL generar una notificación del sistema con el hilo y el paso del plan. Los veredictos `alineado` y `menor` MUST no notificar.

#### Scenario: Notificación
- **WHEN** un juicio marca `desvío`
- **THEN** el humano recibe una notificación del sistema aunque la app esté en segundo plano

### Requirement: Sin solapamiento con Heimdall
Vár SHALL no ejecutar tests, no validar contra criterios de aceptación, no editar código, el plan ni `tasks.md`, y no guardar nada en la memoria de Munin.

#### Scenario: Vigilancia sin escritura
- **WHEN** termina una tarea vigilada con varios juicios
- **THEN** el plan, el `tasks.md` y la memoria de Munin no tienen cambios hechos por Vár
