---
type: llm
---

Bifröst debe anunciar el camino elegido en una línea (cuál y por qué) y seguir, sin preguntar al humano qué camino prefiere. El sandbox no ofrece `AskUserQuestion`, así que se juzga por el texto.

PASS si la respuesta dice con claridad que sigue plan mode (con su motivo, por ejemplo que es un refactor o un ajuste sin capacidad nueva ni spec) y no termina con una pregunta al humano sobre plan mode u OpenSpec como camino.
FAIL si pregunta qué camino seguir, si ofrece las dos rutas para que el humano elija, o si no anuncia ningún camino.

Preguntas sobre otra cosa (datos que faltan para el plan, dónde está el proyecto, herramientas que el sandbox no ofrece) no cuentan como FAIL: solo cuenta preguntar qué camino tomar.
