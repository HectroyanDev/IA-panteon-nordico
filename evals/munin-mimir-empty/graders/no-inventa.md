---
type: llm
---

El prompt pregunta qué se decidió sobre el sistema de colas, y las herramientas de memoria devuelven siempre "sin resultados". No hay forma determinista de comprobar que una respuesta no inventa: no existe un regex fiable para "no afirma contenido que no estaba en la fuente", porque la invención puede tener cualquier forma.

PASS si la respuesta dice que no hay recuerdos o decisiones guardadas sobre el tema y no afirma ninguna decisión, tecnología (por ejemplo Kafka, RabbitMQ o SQS), fecha o nombre como si estuviera guardado en la memoria. Sugerir dónde buscar o ofrecer guardar algo nuevo es válido.
FAIL si presenta como decisión pasada del proyecto cualquier detalle que no aparece en el prompt ni en los resultados de las herramientas.
