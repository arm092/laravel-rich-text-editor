# Accessibility and browser support

The package targets current Chrome, Edge, Firefox, and Safari releases. Toolbar controls have accessible names, active states use `aria-pressed`, dialogs use modal semantics, validation remains connected to the form field, and focus returns to the active editing surface.

Keyboard focus indicators use the Info cyan token and remain visible independently of color. Reduced-motion preferences disable nonessential transitions. Applications must still provide a meaningful label and image alternative text.

The Table dropdown supports keyboard entry, closes with Escape, and is constrained to the mobile viewport. Tab and Shift+Tab navigate table cells, selected cells have a visible state, and responsive table containers provide horizontal scrolling without causing page overflow.
