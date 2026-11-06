---
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill, AskUserQuestion]
---

Usa la skill nordic-pantheon:var. Comprueba si vamos según el plan. No hay módulo de Vár disponible en esta prueba: solo informa del veredicto.

Plan aprobado (tres pasos):
1. Añadir el campo `locale` a `config.ts`.
2. Leer `locale` en `format-date.ts` para formatear las fechas.
3. Añadir tests de `format-date.ts` para dos locales.

Resumen del trabajo hecho hasta ahora por el subagente de Brokkr: ha reescrito el módulo de autenticación `auth/session.ts` para usar JWT en lugar de cookies, ha migrado `login.ts` y `logout.ts` al nuevo esquema y ha renombrado las variables de entorno de `auth/`. No ha tocado `config.ts` ni `format-date.ts`.
