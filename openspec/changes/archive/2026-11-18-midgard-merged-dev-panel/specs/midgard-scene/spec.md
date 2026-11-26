## MODIFIED Requirements

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

### Requirement: REQ-016 Avisos en tickets mergeados en dev
Un ticket mergeado en dev SHALL no dar el aviso (1), porque ese estado ya es coherente con una PR mergeada, y MUST seguir evaluándose para los avisos (2) y (3) y para el estancamiento.

#### Scenario: Mergeado en dev con PR mergeada
- **WHEN** `ICM-1398` está en "Done (Merged in Dev)" y su única PR está mergeada
- **THEN** aparece en "Mergeados en dev" sin el aviso de PRs mergeadas con Jira abierto y el ticket no cuenta en la cifra de tickets con aviso

#### Scenario: Mergeado en dev con la lista vacía
- **WHEN** `jiraMergedStatuses` es una lista vacía y un ticket en "Done (Merged in Dev)" tiene su única PR mergeada
- **THEN** aparece en el panel del repositorio de su PR, no en "Mergeados en dev", y su fila muestra el aviso de PRs mergeadas con Jira abierto

### Requirement: REQ-018 Cifras de cabecera
Midgard SHALL mostrar encima de los paneles: tickets en curso, PRs abiertas, PRs esperando revisión, PRs con cambios pedidos, estancadas (PRs abiertas más tickets en curso sin PR enlazada) y tickets con aviso Jira↔repo. Una PR enlazada a varios tickets MUST contarse una vez. Los tickets mergeados en dev y sus PRs MUST contar en las seis cifras con las mismas reglas que el resto.

#### Scenario: PR con dos claves
- **WHEN** una PR abierta nombra `ICM-1` e `ICM-2`, ambos en curso
- **THEN** aparece en las dos filas y la cifra de PRs abiertas la cuenta una vez

#### Scenario: Mergeados en dev en las cifras
- **WHEN** `ICM-1470` está mergeado en dev con su única PR mergeada e `ICM-1471` está mergeado en dev sin PR y con 5 días laborables sin movimiento
- **THEN** la cifra de tickets en curso cuenta los dos y la de estancadas cuenta `ICM-1471`, con los mismos valores que si se mostraran en los paneles por repositorio y en "Sin PR"

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

## ADDED Requirements

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
