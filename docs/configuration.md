# Configuration and profiles

The published config controls asset loading, palette, code view, and named profiles. A profile is a security boundary, not only a toolbar preset: its headings, links, images, tables, sizes, client diagnostics, and PHP sanitizer rules must remain aligned.

Select a profile globally with `default_profile` or per component with `profile="minimal"`. Create a new profile by copying the complete structure of an existing one. Toolbar separators use `|`; unknown commands are ignored.

When `profile` is omitted or empty, the configured default is used. If `default_profile` is missing or empty in an older published config, the package safely falls back to `standard`.

The usual `standard` setup therefore needs no profile suffix or argument: use `RichTextCast::class`, `new RichTextRule()`, and Blade components without a `profile` attribute. Specify a profile only to override the default.

Font families are deliberately unsupported. To enable text sizes, map stable names to display labels:

```php
'font_sizes' => [
    'small' => 'Small',
    'large' => 'Large',
    'x-large' => 'Extra large',
],
```

Saved HTML uses `data-rte-size` rather than arbitrary inline styles, allowing the sanitizer to enforce the list exactly.

Text and background colors use the active profile's Tailwind `500` palette:

```php
'colors' => [
    'enabled' => true,
    'palette' => ['red', 'orange', 'green', 'blue', 'brand'],
],
```

The browser shows only palette entries whose `--color-{name}-500` variable is declared by the application's Tailwind theme. If the page declares none of them, the editor falls back to all standard Tailwind `500` colors. Add custom names such as `brand` to the profile allowlist so browser and PHP sanitization remain symmetric.

Configure responsive image widths inside each profile:

```php
'images' => [
    // Keep false unless stored HTML intentionally uses relative image URLs.
    'allow_relative' => false,
    'schemes' => ['http', 'https'],
    'alignments' => ['left', 'center', 'right'],
    'resize' => [
        'enabled' => true,
        'min' => 20,
        'max' => 100,
        'step' => 5,
    ],
],
```

The range is expressed as percentages. Valid widths must align with the configured step starting at `min`. Set `enabled` to `false` to hide resize controls and remove persisted widths during sanitization.

Configure tables inside each profile:

```php
'tables' => [
    'enabled' => true,
    'horizontal_alignments' => ['left', 'center', 'right'],
    'vertical_alignments' => ['top', 'middle', 'bottom'],
    'scopes' => ['row', 'col', 'rowgroup', 'colgroup'],
    'max_span' => 100,
    'palette' => ['primary', 'success', 'error', 'info', 'graphite', 'ink', 'paper', 'white'],
],
```

The `minimal` profile disables tables. Custom profiles may restrict the alignment, scope, span, and palette allowlists further.

Table resizing needs no separate option. When `tables.enabled` is true, widths from 20% through 100% are available in 5% increments through drag, keyboard, and exact-width controls.
