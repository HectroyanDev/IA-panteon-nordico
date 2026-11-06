# Tasks

## 1. Verificación previa

- [x] 1.1 En una sesión real con esfuerzo distinto de `high`, añadir de forma provisional `effort: high` a `skills/odin/SKILL.md`, invocar `/odin` y observar (interfaz o `/status`) el esfuerzo al terminar la skill dentro del turno y en el turno siguiente (D5); verificar que el resultado, o "no observable", queda anotado en `design.md` (D5 y Risks)

## 2. Frontmatter

- [x] 2.1 Añadir `effort` a los 12 `skills/*/SKILL.md` y `model` a odin, bifrost (`opus`), hela y forseti (`sonnet`) según la tabla de la proposal, sin tocar el resto del frontmatter ni el cuerpo; verificar con `grep -H '^model:\|^effort:' skills/*/SKILL.md` (12 `effort` y 12 `model` con los valores exactos) y que `claude plugin validate .` pasa (si rechaza `effort`, parar y devolver a Bifröst)

## 3. Documentación y versión

- [x] 3.1 Actualizar `bifrost/CLAUDE.md` según D4: tabla del panteón con modelo y esfuerzo y sección "Especialistas en subagente" (arrastre del modelo al resto del turno, vuelta al de la sesión con el siguiente mensaje, Bifröst global con el de la sesión); verificar que `grep -n 'modelo de la sesión' bifrost/CLAUDE.md` solo devuelve frases coherentes con el ADDED "Modelo y esfuerzo de Bifröst" y que los valores coinciden con el frontmatter
- [x] 3.2 Actualizar `README.md`: tabla "El panteón" con modelo y esfuerzo, "Cambiar el modelo de un especialista" cubriendo `effort` (valores admitidos y arrastre en el hilo principal) en lugar de la frase "no tienen `model` a propósito", y sección "Cambios en 1.4.0"; subir `.claude-plugin/plugin.json` a `1.4.0`; verificar que los valores del README coinciden con el frontmatter y que `claude plugin validate .` pasa

## 4. Regresión

- [x] 4.1 Ejecutar `bash tests/install_test.sh` y `bash tests/evals_test.sh`; verificar que ambos pasan enteros
- [x] 4.2 Ejecutar una pasada de `tests/evals.sh` (sin publicar, tope 2 USD fijo); verificar que todos los casos pasan, que la salida no contiene URL de publicación y anotar el coste en `design.md` (si sale con 2 por tope, repetir solo los casos pendientes con `--case`)

## Workflow follow-up

- Validar con Heimdall (`/opsx:verify`) y, si pasa, cerrar con Hela (`/opsx:archive`).
- Guardar con Munin la duración real del `effort` inline observada en 1.1.
