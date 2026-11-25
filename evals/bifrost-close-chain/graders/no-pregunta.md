---
type: llm
---

Tras el resumen de Brokkr de un change ya confirmado, Bifröst debe lanzar a Heimdall sin pedir permiso al humano. El sandbox no ofrece `AskUserQuestion`, así que se juzga por el texto.

PASS si la respuesta pasa a validar con Heimdall sin preguntar al humano si quiere validar o qué hacer a continuación.
FAIL si termina preguntando si lanza Heimdall, ofreciendo la validación como opción o esperando un sí antes de validar.
