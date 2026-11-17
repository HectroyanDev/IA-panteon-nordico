# pantheon-scenes Specification

## Purpose
Fijar el contrato común de las escenas del panteón: vistas temáticas que una tarea local mantiene al día en un artifact privado, siempre en la misma URL, con el mismo comportamiento ante fallos y la misma forma de instalarse, refrescarse y leer las fuentes.

## Requirements

### Requirement: REQ-001 Escena como skill del plugin
Cada escena SHALL ser una skill del plugin `nordic-pantheon` (`skills/<escena>/SKILL.md` con `references/role.md`), invocable como `/<escena>`, que se ejecuta en el hilo principal. La primera invocación sin estado previo MUST preparar la escena (primera publicación y tarea programada); las siguientes MUST refrescarla.

#### Scenario: Primera invocación
- **WHEN** el humano escribe `/midgard` y no existe estado de la escena
- **THEN** la escena recoge datos, publica un artifact nuevo, guarda su URL y crea la tarea programada, y responde con el enlace y el horario de refresco

#### Scenario: Invocación con escena preparada
- **WHEN** el humano escribe `/midgard` y la escena ya tiene estado con URL
- **THEN** la escena refresca los datos y vuelve a publicar en esa URL, sin crear otro artifact ni otra tarea programada

### Requirement: REQ-002 Estado local de la escena
Cada escena SHALL guardar su estado en `${XDG_STATE_HOME:-$HOME/.local/state}/nordic-pantheon/scenes/<escena>/`: la URL del artifact, el identificador de la tarea programada y su horario, y los últimos datos válidos de cada fuente. La escena MUST no guardar ese estado en el repo ni en la config del panteón.

#### Scenario: URL persistida
- **WHEN** la escena publica su artifact por primera vez
- **THEN** la URL queda en el estado de la escena y la siguiente ejecución la usa

#### Scenario: Reinstalar el panteón
- **WHEN** el humano ejecuta `./install.sh install` o `update` con una escena preparada
- **THEN** el estado de la escena no cambia y la siguiente actualización publica en la misma URL

### Requirement: REQ-003 Misma URL en cada refresco
Cada refresco SHALL actualizar el artifact cuya URL está en el estado de la escena. Si esa URL ya no se puede actualizar (borrada o sin permiso), la escena MUST no crear otro artifact por su cuenta en una ejecución programada: termina sin publicar y deja anotado el motivo para la siguiente invocación manual, que lo explica al humano y solo crea uno nuevo si el humano lo pide.

#### Scenario: Refresco normal
- **WHEN** la tarea programada se ejecuta con la escena preparada
- **THEN** el artifact de la URL guardada muestra los datos nuevos y no aparece ningún artifact nuevo en la galería del humano

#### Scenario: Artifact borrado
- **WHEN** la tarea programada se ejecuta y la URL guardada ya no existe
- **THEN** no se publica ningún artifact nuevo y la siguiente invocación de `/midgard` explica que el artifact ya no existe y ofrece crear uno

### Requirement: REQ-004 Artifact privado
La escena SHALL publicar su artifact como privado y MUST no compartirlo, fijarlo ni cambiar su visibilidad.

#### Scenario: Primera publicación
- **WHEN** la escena publica el artifact por primera vez
- **THEN** el artifact es privado y no se ha compartido con nadie

### Requirement: REQ-005 Página autocontenida desde un snapshot
La página de una escena SHALL construirse a partir de una plantilla HTML fija de la escena y de un snapshot JSON con los datos ya calculados, incrustado en la propia página. Construir la página con el mismo snapshot y la misma plantilla MUST dar el mismo HTML. Los textos que vienen de las fuentes (títulos, nombres) MUST mostrarse como texto, nunca interpretarse como HTML.

#### Scenario: Construcción determinista
- **WHEN** se construye dos veces la página con el mismo snapshot
- **THEN** los dos HTML son idénticos

#### Scenario: Título con marcado
- **WHEN** un ticket se titula `<img src=x onerror=alert(1)>`
- **THEN** la página muestra ese texto literal y no se ejecuta nada

### Requirement: REQ-006 Refresco por tarea programada local
La escena SHALL refrescarse con una tarea programada local de la app de escritorio de Claude Code, en la máquina del humano y con sus conectores, no con una rutina en la nube. Si la app está cerrada a la hora prevista, la ejecución MUST hacerse al abrirla.

#### Scenario: Tarea creada al preparar
- **WHEN** se prepara la escena
- **THEN** existe una tarea programada local con el horario de la escena cuyo prompt invoca la escena en modo refresco

#### Scenario: App cerrada
- **WHEN** la app está cerrada a la hora del refresco y el humano la abre más tarde
- **THEN** el refresco se ejecuta al abrirla y la página muestra esa hora como última actualización

### Requirement: REQ-007 Marcas de actualización
La página SHALL mostrar la hora de la última actualización y la de la próxima prevista. Si al abrirla han pasado más de 2 horas desde la próxima prevista (ese refresco no llegó), MUST mostrar un aviso de que la tarea programada puede no estar corriendo.

#### Scenario: Página al día
- **WHEN** el humano abre la página tras un refresco
- **THEN** ve la hora de ese refresco y la del siguiente según el horario

#### Scenario: Fin de semana sin refrescos
- **WHEN** el horario es de lunes a viernes y el humano abre el sábado la página del viernes por la tarde
- **THEN** no ve ningún aviso de antigüedad

#### Scenario: Refresco perdido
- **WHEN** la próxima prevista era a las 08:00 y el humano abre la página a las 10:30 sin que se haya refrescado
- **THEN** ve un aviso de que la tarea programada puede no estar corriendo

### Requirement: REQ-008 Fallos parciales de las fuentes
Si una fuente falla (sin sesión, conector caído, respuesta no válida), la escena SHALL publicar igualmente con las demás fuentes y MUST mostrar en la página qué fuente falló y por qué. Para la fuente caída MUST usar sus últimos datos válidos marcados con su fecha, si los hay. Las reglas que dependen de la ausencia de datos de esa fuente MUST no presentarse como ciertas.

#### Scenario: Una fuente caída con datos previos
- **WHEN** `gh` no tiene sesión y hay datos válidos de GitHub de una ejecución anterior
- **THEN** la página se publica, avisa de que GitHub falló y muestra las PRs de GitHub de esa ejecución con su fecha

#### Scenario: Una fuente caída sin datos previos
- **WHEN** el MCP de Atlassian no responde en la primera ejecución
- **THEN** la página se publica con un aviso de que Jira y Bitbucket fallaron, sin romperse

### Requirement: REQ-009 Solo lectura sobre las fuentes
Una escena SHALL solo leer de sus fuentes: MUST no crear, editar, transicionar, comentar, aprobar, mergear ni cerrar nada en Jira, GitHub, Bitbucket u otra fuente.

#### Scenario: Incoherencia detectada
- **WHEN** la escena detecta un ticket que no cuadra con sus PRs
- **THEN** lo muestra como aviso y no llama a ninguna operación de escritura de Jira
