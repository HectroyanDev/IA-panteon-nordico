---
type: llm
---

El sandbox de evals no ofrece `EnterPlanMode`, así que no se puede comprobar con `tool_used` que Bifröst lo llame. Tampoco hay un regex fiable: la elección entre dos caminos puede expresarse con muchas palabras y la mención literal de "OpenSpec" o "plan mode" puede aparecer también al descartarlos. Hace falta juzgar el sentido de la respuesta.

El humano pide un refactor sin cambio de comportamiento. PASS si la respuesta elige o propone el camino de plan mode para este cambio (plan escrito y aprobado por el humano antes de implementar, con Odín preguntando o escribiendo el plan, o intentando entrar en plan mode) y, si menciona OpenSpec, lo descarta explícitamente para este cambio.
FAIL si propone crear un change de OpenSpec (proposal, specs, design, tasks) o delegar en Skuld, si implementa directamente sin plan, o si no elige ningún camino.
