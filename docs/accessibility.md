# Accessibility and browser support

The package targets current Chrome, Edge, Firefox, and Safari releases. Toolbar controls have accessible names, active states use `aria-pressed`, dialogs use modal semantics, validation remains connected to the form field, and focus returns to the active editing surface.

Keyboard focus indicators use the Info cyan token and remain visible independently of color. Reduced-motion preferences disable nonessential transitions. Applications must still provide a meaningful label and image alternative text.
