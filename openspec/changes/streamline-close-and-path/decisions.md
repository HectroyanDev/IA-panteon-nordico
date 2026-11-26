# Decisiones

## DEC-001 La eval bifrost-plan-mode-behavior queda como limitada

- **Fecha:** 2026-11-25
- **Decisión:** T-2 se da por cerrada con `bifrost-plan-mode-route` en verde (1.00) y `bifrost-plan-mode-behavior` anotada como limitada (0.75 y 0.50 en dos ejecuciones). `bifrost-close-chain` (T-6) pasa con 1.00.
- **Porqué:** `claude plugin eval` corre sin interfaz: no registra `EnterPlanMode` aunque se conceda con `--allow-tools`, desactiva `AskUserQuestion` y no permite fijar `--permission-mode plan`. En las tres respuestas leídas Bifröst elige plan mode con su motivo y descarta OpenSpec; lo que falla es cómo reacciona al no poder entrar en plan mode, que en una sesión real no ocurre. Reescribir la eval (plan en archivo o pregunta como texto) queda para más adelante.
- **Afecta:** T-2, plan-mode-path/REQ-001.
