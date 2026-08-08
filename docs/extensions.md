# Extension architecture

The package separates Laravel integration, HTML policy, visual editing, code-view adapters, and presentation styles. Public extension points in `0.1.x` are named profiles, toolbar configuration, CSS variables, Blade view overrides, and JavaScript events.

Internal editor-engine objects are not public extension points. A stable extension registry and separately published ESM modules are candidates for a later release after the initial API receives real-world feedback.
