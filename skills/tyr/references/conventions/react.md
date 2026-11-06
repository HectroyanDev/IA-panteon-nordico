# React

Aplica también `js.md`. Las reglas del repo (`eslint-plugin-react`, `eslint-plugin-react-hooks`) mandan.

## Componentes (BAJA)

- Componentes funcionales; nombre `PascalCase`, un componente exportado por archivo.
- Props desestructuradas; tipadas con TypeScript o `PropTypes` si el repo los usa.
- Componentes pequeños: extrae subcomponentes o hooks cuando pasan de una responsabilidad.
- Lógica reutilizable en hooks `useAlgo`.

## Hooks (MEDIA, ALTA si causa bucle o datos erróneos)

- Reglas de hooks: solo en el nivel superior, nunca en condiciones o bucles.
- Dependencias completas en `useEffect`, `useMemo`, `useCallback`; sin desactivar `exhaustive-deps` sin motivo.
- `useEffect` con limpieza (suscripciones, timers, `AbortController` en fetch).
- No usar `useEffect` para derivar estado que se puede calcular en render.
- No actualizar estado en render (bucle infinito, ALTA).

## Estado y render (MEDIA)

- No mutar estado ni props; actualizaciones inmutables y forma funcional `setX(prev => ...)` si depende del anterior.
- `key` estable y única en listas; nunca el índice si la lista se reordena o filtra.
- Sin objetos o funciones nuevas en props de componentes memoizados sin `useMemo`/`useCallback` si causan renders medibles (BAJA si no).
- Estado lo más local posible; no duplicar en estado lo que viene de props.

## Seguridad y accesibilidad

- `dangerouslySetInnerHTML` solo con HTML saneado (lo marca la lente de seguridad).
- Elementos interactivos nativos (`button`, `a`) en vez de `div` con `onClick` (MEDIA).
- `alt` en imágenes, `label` asociado a inputs, foco gestionado en modales (MEDIA).
