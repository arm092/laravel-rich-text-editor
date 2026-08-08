# Casts, validation, and rendering

`RichTextCast` preserves a string model attribute while sanitizing values on assignment:

```php
'content' => RichTextCast::class . ':standard',
```

`null` remains `null`; visually empty editor markup becomes an empty string. The cast accepts strings and `Stringable` values.

Use `new RichTextRule('standard', maxCharacters: 10000)` when validation must reject unsupported markup rather than silently sanitize it. Use `RichTextSanitizer::sanitize($html, 'standard')` for explicit workflows and `<x-rich-text-content>` for rendering.
