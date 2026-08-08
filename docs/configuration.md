# Configuration and profiles

The published config controls asset loading, palette, code view, and named profiles. A profile is a security boundary, not only a toolbar preset: its headings, links, images, sizes, client diagnostics, and PHP sanitizer rules must remain aligned.

Select a profile globally with `default_profile` or per component with `profile="minimal"`. Create a new profile by copying the complete structure of an existing one. Toolbar separators use `|`; unknown commands are ignored.

Font families are deliberately unsupported. To enable text sizes, map stable names to display labels:

```php
'font_sizes' => [
    'small' => 'Small',
    'large' => 'Large',
    'x-large' => 'Extra large',
],
```

Saved HTML uses `data-rte-size` rather than arbitrary inline styles, allowing the sanitizer to enforce the list exactly.
