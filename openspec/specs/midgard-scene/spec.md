# midgard-scene Specification

## Purpose
Midgard es la escena del trabajo en curso del humano: sus tickets de Jira no terminados, las PRs propias que los implementan en GitHub y Bitbucket, en qué punto está cada una, qué lleva días parado y qué ticket no cuadra con su código.

## Requirements

### Requirement: REQ-001 Tickets en curso
Midgard SHALL mostrar los tickets de Jira asignados al humano cuya categoría de estado no es Done. Cada ticket MUST mostrar su clave enlazada a Jira, su estado y su título.

#### Scenario: Ticket terminado
- **WHEN** un ticket asignado al humano pasa a un estado de la categoría Done
- **THEN** no aparece en el siguiente refresco

#### Scenario: Ticket de otra persona
- **WHEN** un ticket en curso está asignado a otra persona
- **THEN** no aparece aunque tenga una PR del humano

### Requirement: REQ-002 Reconocimiento de tickets mergeados en dev
Midgard SHALL reconocer como "mergeado en dev" un ticket en curso cuyo nombre de estado coincide con uno de la lista `jiraMergedStatuses` del estado de la escena (por defecto `Done (Merged in Dev)`), sin distinguir mayúsculas ni espacios sobrantes. La coincidencia MUST ser por nombre completo, no por parte del nombre.

#### Scenario: Otras mayúsculas
- **WHEN** el estado de un ticket es "done (merged in dev)" y la lista contiene "Done (Merged in Dev)"
- **THEN** el ticket aparece en el panel "Mergeados en dev"

#### Scenario: Nombre parecido
- **WHEN** el estado de un ticket es "Not merged" o "Merged" y la lista solo contiene "Done (Merged in Dev)"
- **THEN** el ticket no aparece en el panel "Mergeados en dev"

#### Scenario: Lista vacía
- **WHEN** `jiraMergedStatuses` es una lista vacía
- **THEN** ningún ticket aparece en el panel "Mergeados en dev" y los tickets en "Done (Merged in Dev)" se tratan como cualquier otro ticket en curso

### Requirement: REQ-003 Presentación de tickets mergeados en dev
Un ticket mergeado en dev SHALL mostrarse solo en el panel "Mergeados en dev", no en los paneles por repositorio ni en el bloque "Sin PR", y MUST seguir contando en las cifras de cabecera, junto con sus PRs, igual que cualquier ticket en curso.

#### Scenario: Estado mergeado en dev
- **WHEN** `ICM-1398` está en "Done (Merged in Dev)", de categoría In Progress en Jira, con la lista por defecto y su única PR mergeada en `casfidIdasfest/icm-backoffice`
- **THEN** aparece en el panel "Mergeados en dev", no aparece en el panel de `casfidIdasfest/icm-backoffice` y cuenta en la cifra de tickets en curso

#### Scenario: Mergeado en dev con PR abierta
- **WHEN** un ticket mergeado en dev tiene una PR abierta esperando revisión en `org/r` y ningún otro ticket en curso la nombra
- **THEN** la PR no aparece en el panel de `org/r` y cuenta en las cifras de PRs abiertas y de PRs esperando revisión

#### Scenario: PR compartida con un ticket no mergeado
- **WHEN** una PR abierta nombra `ICM-1`, en In Progress, e `ICM-2`, mergeado en dev
- **THEN** la PR aparece en la fila de `ICM-1` de su panel de repositorio, `ICM-2` aparece en "Mergeados en dev" con el enlace a esa PR, y la cifra de PRs abiertas la cuenta una vez

### Requirement: REQ-004 PRs propias consideradas
Midgard SHALL considerar solo las PRs cuyo autor es el humano, en GitHub y, en Bitbucket, en el workspace guardado en el estado de la escena (`bitbucketWorkspace`): todas las abiertas y las mergeadas o cerradas sin merge en los últimos 90 días. Las PRs donde el humano solo es revisor MUST no aparecer.

#### Scenario: PR como revisor
- **WHEN** al humano le piden revisar una PR de otra persona con la clave de uno de sus tickets
- **THEN** esa PR no aparece

#### Scenario: PR mergeada antigua
- **WHEN** una PR del humano se mergeó hace 120 días
- **THEN** no se considera

#### Scenario: PR de Bitbucket en otro workspace
- **WHEN** el workspace de Bitbucket guardado en el estado de la escena es `casfidIdasfest` y el humano tiene una PR abierta en otro workspace
- **THEN** esa PR no aparece

### Requirement: REQ-005 Unión ticket↔PR
Una PR SHALL enlazarse a un ticket cuando la clave del ticket aparece en el nombre de su rama o en su título, sin distinguir mayúsculas y como palabra completa (la clave `ICM-12` no casa con `ICM-123`). Una PR que nombra varias claves MUST enlazarse a cada uno de esos tickets.

#### Scenario: Clave en la rama
- **WHEN** la rama de una PR es `feature/icm-123-reintentos` y existe el ticket en curso `ICM-123`
- **THEN** la PR aparece en la fila de `ICM-123`

#### Scenario: Clave en el título
- **WHEN** el título de una PR es `ICM-123: reintentos` y su rama no tiene clave
- **THEN** la PR aparece en la fila de `ICM-123`

#### Scenario: Prefijo de otra clave
- **WHEN** la rama de una PR es `feature/ICM-1234` y el ticket en curso es `ICM-123`
- **THEN** la PR no se enlaza a `ICM-123`

### Requirement: REQ-006 Agrupación por repositorio
Midgard SHALL agrupar las filas de los tickets en curso que no están mergeados en dev en un panel por repositorio, derivado de sus PRs enlazadas, sin lista de repositorios configurada. Cada panel MUST indicar si el repositorio es de GitHub o de Bitbucket. Un ticket con PRs en varios repositorios MUST aparecer en el panel de cada uno con la PR de ese repositorio; con varias PRs en el mismo repositorio, una fila por PR.

#### Scenario: Ticket en dos repositorios
- **WHEN** `ICM-1405` tiene una PR en `org/payments-api` y otra en `org/web-checkout`
- **THEN** aparece en los dos paneles, cada uno con su PR

#### Scenario: Repositorio solo con tickets mergeados en dev
- **WHEN** todas las PRs de `org/facturas` están enlazadas solo a tickets mergeados en dev
- **THEN** no hay panel de `org/facturas`

### Requirement: REQ-007 Bloque "Sin PR"
Midgard SHALL mostrar en un bloque "Sin PR" los tickets en curso que no están mergeados en dev y no tienen ninguna PR enlazada.

#### Scenario: Ticket sin PR
- **WHEN** un ticket en curso no mergeado en dev no tiene ninguna PR enlazada
- **THEN** aparece en el bloque "Sin PR" y en ningún panel de repositorio

#### Scenario: Mergeado en dev sin PR
- **WHEN** un ticket mergeado en dev no tiene ninguna PR enlazada
- **THEN** no aparece en el bloque "Sin PR" y aparece en el panel "Mergeados en dev"

### Requirement: REQ-008 Estado de cada PR
Cada PR SHALL mostrar un único estado, evaluado en este orden: "Mergeada"; "Cerrada sin merge"; "Borrador" (abierta y marcada como borrador); "Cambios pedidos" (abierta con al menos una revisión vigente que pide cambios); "Lista para merge" (abierta con aprobaciones suficientes); "Esperando revisión" (el resto de abiertas). Las aprobaciones son suficientes cuando alcanzan las requeridas por el repositorio; si el número requerido no se puede leer, cuando la plataforma da la PR por aprobada.

#### Scenario: Cambios pedidos con aprobaciones
- **WHEN** una PR abierta tiene 2 aprobaciones de 2 requeridas y una revisión vigente que pide cambios
- **THEN** su estado es "Cambios pedidos"

#### Scenario: Aprobaciones suficientes
- **WHEN** una PR abierta tiene 2 aprobaciones de 2 requeridas y ninguna petición de cambios
- **THEN** su estado es "Lista para merge"

#### Scenario: Requeridas desconocidas
- **WHEN** no se puede leer cuántas aprobaciones exige el repositorio y la plataforma no da la PR por aprobada
- **THEN** su estado es "Esperando revisión" y la revisión muestra las aprobaciones sin denominador

### Requirement: REQ-009 Aprobación de PRs de Bitbucket
Bitbucket no da ni las aprobaciones requeridas ni un aprobado de PR. Una PR abierta de Bitbucket SHALL considerarse aprobada por la plataforma con al menos una aprobación, aunque queden revisores pendientes; una petición de cambios MUST seguir dando "Cambios pedidos", que se evalúa antes.

#### Scenario: Bitbucket con una aprobación y revisores pendientes
- **WHEN** una PR abierta de Bitbucket tiene 1 aprobación, 1 revisor pendiente y ninguna petición de cambios
- **THEN** su estado es "Lista para merge" y la revisión muestra `1 aprob.` y el revisor pendiente

#### Scenario: Bitbucket con una aprobación y cambios pedidos
- **WHEN** una PR abierta de Bitbucket tiene 1 aprobación y 1 revisor que pide cambios
- **THEN** su estado es "Cambios pedidos"

#### Scenario: Bitbucket sin aprobaciones
- **WHEN** una PR abierta de Bitbucket no tiene aprobaciones ni peticiones de cambios
- **THEN** su estado es "Esperando revisión"

### Requirement: REQ-010 Aprobación de PRs de GitHub
Una PR abierta de GitHub SHALL considerarse aprobada por la plataforma cuando GitHub da `reviewDecision` `APPROVED`; si GitHub no da veredicto (repositorio sin revisiones obligatorias), basta con al menos una aprobación. Con `REVIEW_REQUIRED` o `CHANGES_REQUESTED` MUST no considerarse aprobada, y una petición de cambios MUST seguir dando "Cambios pedidos", que se evalúa antes que "Lista para merge".

#### Scenario: GitHub con veredicto aprobado
- **WHEN** una PR abierta de GitHub tiene `reviewDecision` `APPROVED`, no se pueden leer las aprobaciones requeridas y no hay peticiones de cambios
- **THEN** su estado es "Lista para merge"

#### Scenario: GitHub con revisión requerida
- **WHEN** una PR abierta de GitHub tiene `reviewDecision` `REVIEW_REQUIRED` y 1 de 2 aprobaciones
- **THEN** su estado es "Esperando revisión"

#### Scenario: GitHub sin veredicto con una aprobación
- **WHEN** una PR abierta de GitHub no tiene `reviewDecision`, no se pueden leer las aprobaciones requeridas y tiene 1 aprobación y ninguna petición de cambios
- **THEN** su estado es "Lista para merge"

#### Scenario: GitHub sin veredicto ni aprobaciones
- **WHEN** una PR abierta de GitHub no tiene `reviewDecision` ni aprobaciones
- **THEN** su estado es "Esperando revisión"

### Requirement: REQ-011 Revisión de cada PR abierta
Cada PR abierta SHALL mostrar aprobaciones frente a requeridas, el número de revisiones que piden cambios, el número de hilos de comentarios sin resolver y los revisores pendientes. Un dato que la plataforma no da MUST omitirse, no mostrarse como cero.

#### Scenario: Revisión completa
- **WHEN** una PR abierta tiene 1 de 2 aprobaciones, 3 hilos sin resolver y `lmartin` pendiente
- **THEN** la fila muestra `1/2 aprob.`, `3 sin resolver` y `→ lmartin`

#### Scenario: Comentarios no disponibles
- **WHEN** la plataforma no informa de hilos sin resolver
- **THEN** la fila no muestra el dato de comentarios sin resolver

#### Scenario: PR de Bitbucket sin requeridas ni comentarios
- **WHEN** una PR abierta de Bitbucket tiene 2 aprobaciones y no se conocen ni las aprobaciones requeridas ni los hilos sin resolver
- **THEN** la fila muestra `2 aprob.` sin denominador, no muestra dato de comentarios sin resolver y no muestra textos como "null", "undefined", "?" ni un cero en su lugar

### Requirement: REQ-012 Movimiento
El último movimiento de una PR SHALL ser el más reciente entre su último commit, revisión, comentario o cambio de estado; el de un ticket, su última actualización en Jira.

#### Scenario: Comentario reciente
- **WHEN** el último commit de una PR es de hace 10 días y alguien comentó ayer
- **THEN** su último movimiento es el comentario de ayer

### Requirement: REQ-013 Estancamiento
Midgard SHALL marcar como estancada una PR abierta, o un ticket en curso sin ninguna PR enlazada, que lleva 5 o más días laborables sin movimiento. Días laborables son de lunes a viernes en la zona horaria de la máquina, sin festivos, contados desde el día siguiente al último movimiento hasta el día del refresco, ambos incluidos. Cada fila de los paneles por repositorio y de "Sin PR" MUST mostrar sus días laborables sin movimiento.

#### Scenario: Cinco días laborables
- **WHEN** el último movimiento de una PR abierta fue el lunes 9 y el refresco es el lunes 16
- **THEN** lleva 5 días laborables quieta y se marca como estancada

#### Scenario: Fin de semana
- **WHEN** el último movimiento fue el viernes 13 y el refresco es el lunes 16
- **THEN** lleva 1 día laborable quieta y no se marca

#### Scenario: PR mergeada antigua
- **WHEN** una PR mergeada lleva 8 días laborables sin movimiento
- **THEN** muestra sus días pero no se marca como estancada

#### Scenario: Mergeado en dev sin PR y quieto
- **WHEN** un ticket en "Done (Merged in Dev)" no tiene PR enlazada y su última actualización en Jira fue hace 5 días laborables
- **THEN** aparece en "Mergeados en dev" y no en "Sin PR", se marca como estancado y cuenta en la cifra de estancadas

### Requirement: REQ-014 Avisos de coherencia Jira↔repo
Midgard SHALL mostrar un aviso en la fila del ticket, con enlace al ticket y a sus PRs, en estos casos: (1) no está mergeado en dev y tiene al menos una PR mergeada y ninguna abierta (las cerradas sin merge no cuentan); (2) está en un estado de revisión y no tiene ninguna PR abierta; (3) está en un estado de categoría To Do y tiene al menos una PR abierta. Midgard MUST solo avisar y nunca cambiar el ticket.

#### Scenario: Todo mergeado con Jira abierto
- **WHEN** `ICM-1398` está en In Progress y su única PR está mergeada
- **THEN** su fila muestra el aviso de PRs mergeadas con Jira abierto y enlaces a `ICM-1398` y a la PR

#### Scenario: Mergeada y cerrada sin merge
- **WHEN** un ticket en In Progress tiene una PR cerrada sin merge y otra mergeada, y ninguna abierta
- **THEN** su fila muestra el aviso de PRs mergeadas con Jira abierto

#### Scenario: Under Review sin PR abierta
- **WHEN** `ICM-1420` está en Under Review y su única PR está cerrada sin merge
- **THEN** su fila muestra el aviso de ticket en revisión sin PR abierta

#### Scenario: En Revisión sin PR abierta
- **WHEN** un ticket está en "En Revisión", con la lista por defecto, y no tiene ninguna PR abierta
- **THEN** su fila muestra el aviso de ticket en revisión sin PR abierta, con el nombre "En Revisión" en el texto

#### Scenario: Backlog con PR abierta
- **WHEN** un ticket está en Backlog y tiene una PR abierta
- **THEN** su fila muestra el aviso de PR abierta con el ticket sin empezar

#### Scenario: Ticket coherente
- **WHEN** un ticket está en In Progress con una PR abierta
- **THEN** su fila no muestra aviso

### Requirement: REQ-015 Reconocimiento de estados de revisión
Midgard SHALL considerar "en revisión", para el aviso (2), un ticket cuyo nombre de estado coincide con uno de la lista `jiraReviewStatuses` del estado de la escena, sin distinguir mayúsculas ni espacios sobrantes y por nombre completo, no por parte del nombre. Si la clave falta, Midgard MUST usar la lista por defecto `["Under Review", "En Revisión"]`; si la lista está vacía, ningún estado es de revisión y el aviso (2) no se da.

#### Scenario: Lista por defecto
- **WHEN** `scene.json` no tiene la clave `jiraReviewStatuses` y un ticket en "En Revisión" no tiene ninguna PR abierta
- **THEN** su fila muestra el aviso de ticket en revisión sin PR abierta

#### Scenario: Otras mayúsculas y espacios
- **WHEN** el estado de un ticket es " under  review " y la lista contiene "Under Review"
- **THEN** el ticket se considera en revisión

#### Scenario: Nombre parecido
- **WHEN** el estado de un ticket es "Review blocked" o "En Revision" (sin tilde) y la lista es la de por defecto
- **THEN** el ticket no se considera en revisión

#### Scenario: Lista de revisión vacía
- **WHEN** `jiraReviewStatuses` es una lista vacía y un ticket en "Under Review" no tiene ninguna PR abierta
- **THEN** su fila no muestra el aviso de ticket en revisión sin PR abierta

### Requirement: REQ-016 Avisos en tickets mergeados en dev
Un ticket mergeado en dev SHALL no dar el aviso (1), porque ese estado ya es coherente con una PR mergeada, y MUST seguir evaluándose para los avisos (2) y (3) y para el estancamiento.

#### Scenario: Mergeado en dev con PR mergeada
- **WHEN** `ICM-1398` está en "Done (Merged in Dev)" y su única PR está mergeada
- **THEN** aparece en "Mergeados en dev" sin el aviso de PRs mergeadas con Jira abierto y el ticket no cuenta en la cifra de tickets con aviso

#### Scenario: Mergeado en dev con la lista vacía
- **WHEN** `jiraMergedStatuses` es una lista vacía y un ticket en "Done (Merged in Dev)" tiene su única PR mergeada
- **THEN** aparece en el panel del repositorio de su PR, no en "Mergeados en dev", y su fila muestra el aviso de PRs mergeadas con Jira abierto

### Requirement: REQ-017 Avisos con una fuente de PRs caída
Si GitHub o Bitbucket fallan sin datos previos válidos, Midgard SHALL no mostrar como ciertos los avisos que dependen de que no haya PR abierta, (1) y (2), ni la pertenencia al bloque "Sin PR", porque la PR que falta puede estar en la fuente caída: esas filas MUST mostrarse con la marca "incompleto" nombrando la fuente. El aviso (3) se basa en una PR abierta visible y MUST mostrarse igual.

#### Scenario: GitHub caído en la primera ejecución
- **WHEN** `gh` no tiene sesión, no hay datos previos de GitHub y un ticket en Under Review no tiene PRs en Bitbucket
- **THEN** el ticket aparece en "Sin PR" con la marca "incompleto: GitHub" y sin el aviso de ticket en revisión sin PR abierta

### Requirement: REQ-018 Cifras de cabecera
Midgard SHALL mostrar encima de los paneles: tickets en curso, PRs abiertas, PRs esperando revisión, PRs con cambios pedidos, estancadas (PRs abiertas más tickets en curso sin PR enlazada) y tickets con aviso Jira↔repo. Una PR enlazada a varios tickets MUST contarse una vez. Los tickets mergeados en dev y sus PRs MUST contar en las seis cifras con las mismas reglas que el resto.

#### Scenario: PR con dos claves
- **WHEN** una PR abierta nombra `ICM-1` e `ICM-2`, ambos en curso
- **THEN** aparece en las dos filas y la cifra de PRs abiertas la cuenta una vez

#### Scenario: Mergeados en dev en las cifras
- **WHEN** `ICM-1470` está mergeado en dev con su única PR mergeada e `ICM-1471` está mergeado en dev sin PR y con 5 días laborables sin movimiento
- **THEN** la cifra de tickets en curso cuenta los dos y la de estancadas cuenta `ICM-1471`, con los mismos valores que si se mostraran en los paneles por repositorio y en "Sin PR"

### Requirement: REQ-019 Horario de refresco de Midgard
Midgard SHALL refrescarse por defecto a las 08:00 y a las 14:00, de lunes a viernes, en la hora local de la máquina (expresión cron `0 8,14 * * 1-5`). La próxima actualización que muestra la página MUST ser la siguiente hora de ese horario posterior al refresco, saltando el fin de semana. El humano MAY cambiar el horario con `/midgard horario "<cron>"`.

#### Scenario: Tarea con el horario por defecto
- **WHEN** se prepara Midgard
- **THEN** la tarea programada "Midgard" tiene la expresión `0 8,14 * * 1-5`

#### Scenario: Refresco de la mañana
- **WHEN** el refresco del martes termina a las 08:03
- **THEN** la página muestra como próxima actualización el martes a las 14:00

#### Scenario: Refresco del viernes por la tarde
- **WHEN** el refresco del viernes termina a las 14:02
- **THEN** la página muestra como próxima actualización el lunes a las 08:00, y abierta el sábado, el domingo o el lunes a las 09:30 no muestra el aviso de refresco perdido

#### Scenario: Refresco de las 14:00 perdido
- **WHEN** la próxima prevista era el miércoles a las 14:00 y no ha habido refresco
- **THEN** abierta a las 15:30 la página no muestra aviso, y abierta a las 16:30 muestra el aviso de que la tarea programada puede no estar corriendo

### Requirement: REQ-020 Diseño "Tablero de operaciones"
La página de Midgard SHALL seguir el diseño "Tablero de operaciones": franja de cifras arriba; un panel por repositorio con las columnas Ticket, Jira, PR (número, estado y título), Revisión y días quieta; el aviso Jira↔repo como fila ámbar bajo la fila afectada; la marca roja de estancado; el panel "Sin PR"; y al final el panel plegable "Mergeados en dev". MUST verse bien en claro, en oscuro y en anchura de móvil sin desplazamiento horizontal de la página, y usarse con el teclado.

#### Scenario: Modo oscuro
- **WHEN** el humano abre la página con el sistema en modo oscuro
- **THEN** la página usa la paleta oscura y los avisos y marcas siguen distinguiéndose

#### Scenario: Sin tickets
- **WHEN** el humano no tiene tickets en curso
- **THEN** la página muestra las cifras a cero y un mensaje de que no hay tickets en curso

#### Scenario: Teclado
- **WHEN** el humano recorre la página con Tab
- **THEN** llega a la cabecera del panel "Mergeados en dev" con el foco visible y la despliega y la repliega con Enter o Espacio

#### Scenario: Móvil con el panel desplegado
- **WHEN** la página se abre con 375 px de ancho y el panel "Mergeados en dev" desplegado
- **THEN** la página no se desplaza en horizontal

### Requirement: REQ-021 Panel "Mergeados en dev"
Midgard SHALL mostrar los tickets mergeados en dev en un panel "Mergeados en dev", plegado al cargar la página, que se despliega y se repliega con un clic o con el teclado. Su cabecera MUST verse estando plegado y mostrar el total de tickets del panel. Desplegado, cada ticket MUST ocupar una fila compacta con su clave enlazada a Jira, su título, los repositorios de sus PRs y un enlace a cada PR, sin detalle de revisión.

#### Scenario: Plegado al abrir
- **WHEN** hay 2 tickets mergeados en dev y el humano abre la página
- **THEN** el panel está plegado, su cabecera muestra "Mergeados en dev" y el total 2, y las filas no se ven

#### Scenario: Desplegar y replegar
- **WHEN** el humano pulsa la cabecera del panel plegado y después la vuelve a pulsar
- **THEN** primero se ven las filas y después el panel vuelve a quedar plegado

#### Scenario: Fila con PR
- **WHEN** `ICM-1470` está mergeado en dev con su única PR, la #2350 de `feverup/payments-api`, mergeada
- **THEN** su fila muestra la clave enlazada a Jira, el título, `feverup/payments-api` y un enlace a la #2350, sin aprobaciones, hilos sin resolver ni revisores pendientes

#### Scenario: Fila sin PR
- **WHEN** `ICM-1471` está mergeado en dev sin ninguna PR enlazada
- **THEN** su fila muestra la clave enlazada a Jira y el título, e indica que no tiene PR enlazada

#### Scenario: Sin tickets mergeados en dev
- **WHEN** ningún ticket en curso está mergeado en dev
- **THEN** el panel "Mergeados en dev" no aparece

#### Scenario: Fuente de PRs caída
- **WHEN** GitHub falla sin datos previos válidos e `ICM-1471`, mergeado en dev, no tiene ninguna PR visible
- **THEN** su fila lleva la marca "incompleto: GitHub"

### Requirement: REQ-022 Motivos de las cifras en el panel "Mergeados en dev"
Un ticket del panel "Mergeados en dev" que cuenta en la cifra de estancadas o en la de avisos Jira↔repo SHALL mostrar el motivo en su fila: la marca roja de estancado con sus días laborables quieto, o el aviso con su texto y sus enlaces. Cada enlace a una PR MUST mostrar su estado. La cabecera del panel MUST mostrar, también plegado, cuántos estancados (con las unidades de la cifra de estancadas) y cuántos tickets con aviso contiene.

#### Scenario: Ticket sin PR estancado
- **WHEN** `ICM-1471`, mergeado en dev y sin PR, lleva 5 días laborables sin movimiento
- **THEN** la cabecera plegada del panel muestra 1 estancado y, desplegado, su fila muestra la marca de estancado y 5 días

#### Scenario: PR abierta estancada
- **WHEN** un ticket mergeado en dev tiene una PR abierta esperando revisión con 6 días laborables sin movimiento
- **THEN** su fila muestra el enlace a la PR con el estado "Esperando revisión" y la marca de estancado, la cabecera del panel muestra 1 estancado y la cifra de estancadas la cuenta

#### Scenario: Ticket con aviso
- **WHEN** un ticket mergeado en dev da el aviso (3) porque su estado es de categoría To Do y tiene una PR abierta
- **THEN** su fila muestra el aviso con su texto y enlaces, la cabecera del panel muestra 1 aviso y la cifra de avisos Jira↔repo lo cuenta

#### Scenario: Sin motivos
- **WHEN** ningún ticket del panel está estancado ni tiene aviso
- **THEN** la cabecera del panel muestra solo el título y el total
