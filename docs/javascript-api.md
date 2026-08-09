# JavaScript API and events

Global methods:

- `RichTextEditor.create(element, options)`
- `RichTextEditor.scan(root = document)`
- `RichTextEditor.destroy(element)`

Instance methods:

- `getHTML()` returns applied semantic HTML;
- `setHTML(html)` sanitizes and replaces content;
- `focus()` focuses the active visual or code view;
- `setReadOnly(boolean)` updates editability;
- `destroy()` releases editor resources.

Root elements dispatch bubbling custom events: `rte:ready`, `rte:change`, `rte:mode-change`, `rte:validation-error`, and `rte:destroy`. Internal visual-editor and Enhanced code-view objects are intentionally not exposed.
