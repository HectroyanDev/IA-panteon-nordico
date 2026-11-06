# Lentes de revisión

Lanza las tres en un solo mensaje con `Agent` (`subagent_type: general-purpose`). Los subagentes no ven la conversación: el brief lleva todo.

## Brief común (para cada lente)

```
Eres la lente {LENTE} de Tyr, revisor de PRs. Solo lees: no edites, no publiques, no ejecutes comandos que escriban.

PR: {url} · head {sha} · base {rama base}
Lenguajes: {lista}
Mapa de líneas cambiadas (solo puedes comentar estas, lado nuevo): {archivo → rangos}
Diff:
{diff}
Reglas del repo (mandan sobre las convenciones): {contenido o "ninguna"}
Convenciones a leer: {rutas absolutas de references/conventions/<lang>.md}
Hallazgos previos de Tyr: {id, archivo:línea, gravedad, título, cuerpo} o "ninguno"
{solo lógica} Ticket {CLAVE}: {criterios de aceptación} o "sin ticket"

Tarea: {tarea de la lente, abajo}
Gravedad: ALTA / MEDIA / BAJA según {ruta absoluta de assets/comment.md}.
Puedes leer el archivo completo en el head para entender el contexto, pero cada hallazgo se ancla a una línea del mapa. Un riesgo ALTA en código no cambiado que el cambio activa va en "outsideDiff".
Para cada hallazgo previo que te toque, clasifícalo según {ruta de references/rereview.md} y revisa si su fix introduce otro problema.
Sin falsos positivos: si no puedes explicar el caso concreto en el que falla, no lo reportes.
Devuelve solo JSON válido según {ruta absoluta de assets/finding.schema.json}.
```

## Lógica

Tarea: busca errores de comportamiento en el cambio.

- Condiciones invertidas, off-by-one, comparaciones laxas (`==` en PHP/JS donde importa el tipo), null/undefined no controlados, ramas sin cubrir.
- Manejo de errores: excepciones tragadas, promesas sin `await` o sin `catch`, valores de retorno ignorados.
- Estado y concurrencia: condiciones de carrera, efectos de React con dependencias incorrectas, mutación de props/estado.
- Contratos: cambios de firma o de formato de respuesta que rompen a quien llama.
- **Ticket:** cada criterio de aceptación no cubierto o contradicho → ALTA, anclado a la línea más relacionada; si no hay línea, va al resumen.
- **Tests ausentes:** lógica nueva o modificada sin test en la PR que la cubra → MEDIA si es de riesgo (dinero, permisos, datos, ramas complejas), BAJA si es trivial. Ancla al inicio de la función. Categoría `missing-test`.

## Seguridad

Tarea: busca vulnerabilidades introducidas o expuestas por el cambio (OWASP Top 10).

- Inyección: SQL concatenado, `exec`/`shell_exec`/`system`, `eval`, `new Function`, `unserialize` sobre entrada externa.
- XSS: salida sin escapar en PHP (`echo $var` sin `htmlspecialchars`), `innerHTML`, `document.write`, `dangerouslySetInnerHTML`, `v-html`-like, `href` con `javascript:`.
- Autenticación y autorización: endpoints sin comprobar permisos, IDOR, comprobaciones solo en cliente.
- CSRF en formularios y endpoints que cambian estado.
- Secretos en código, logs con datos personales o tokens, `console.log` de datos sensibles.
- Rutas y redirecciones: path traversal en `include`/`require`/`fopen`, open redirect, SSRF con URLs de usuario.
- Cripto: `md5`/`sha1` para contraseñas, `rand`/`Math.random` para tokens.
- Front: `target="_blank"` sin `rel="noopener"` (BAJA), CORS `*` con credenciales, almacenamiento de tokens en `localStorage` (MEDIA).
- Dependencias nuevas en `composer.json`/`package.json`: nombre sospechoso o versión sin fijar (MEDIA).

## Calidad

Tarea: aplica las convenciones de los lenguajes del diff y las reglas del repo.

- Lee solo los `references/conventions/<lang>.md` de los lenguajes presentes.
- Rendimiento: N+1 en bucles, consultas o fetch dentro de render, renders innecesarios, selectores CSS costosos.
- Mantenibilidad: duplicación con código existente del repo, funciones largas o con demasiadas responsabilidades, números mágicos, código muerto.
- Accesibilidad en HTML/React.
- La mayoría de hallazgos de estilo son BAJA; sube a MEDIA solo si afecta a corrección, accesibilidad o rendimiento.
