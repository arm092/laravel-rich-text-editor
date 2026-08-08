# Basic and enhanced code view

`code_view.enabled` controls whether code view exists. `code_view.enhanced` selects the published runtime:

- `false`: `rich-text-editor.js` with a safe textarea fallback;
- `true`: `rich-text-editor-with-code.js` with line numbers, folding, matching, completion, search, diagnostics, formatting, and fullscreen.

The enhanced implementation is private. Applications depend only on the documented code-view behavior and common JavaScript API.

Code view uses a dark Monokai-inspired theme built from the package palette. Before returning to visual mode, the source is compared with the active profile. Lossy sanitization requires explicit confirmation, and unresolved changes block form submission.
