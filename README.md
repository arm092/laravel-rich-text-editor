# Laravel Rich Text Editor

A modern, secure rich text editor for Laravel forms, Alpine.js, Tailwind CSS, and Livewire. It stores semantic HTML, ships with its browser assets, provides responsive resizable images and tables, and includes both Basic and Enhanced code view.

![Visual editor and enhanced HTML code view](docs/images/editor-preview.png)

> This README is the express guide. See the [full documentation](docs/README.md) for every option, integration, and security detail.

## Requirements

- PHP 8.1 or newer
- Laravel 10, 11, 12, or 13
- Livewire 3 or 4 when Livewire binding is needed
- A modern evergreen browser

## Install

```bash
composer require arm092/laravel-rich-text-editor
php artisan rich-text-editor:publish
```

The publish command copies the configuration and prebuilt assets. Published configuration is owned by the application and is not changed by Composer updates. After an upgrade, merge new profile options manually or use `--force` when you intentionally want to replace the published config and assets with package defaults.

## Blade in one minute

```blade
<x-rich-text-editor
    name="content"
    :value="old('content', $post->content)"
    label="Content"
/>
```

To upload JPEG, PNG, or WebP images through an application-owned endpoint, pass its URL to the component:

```blade
<x-rich-text-editor
    name="content"
    image-upload-url="{{ route('admin.images.store') }}"
/>
```

The editor sends a multipart `POST` request with an `image` field, same-origin credentials, and the `X-CSRF-TOKEN` header from `<meta name="csrf-token">`. The endpoint returns an absolute or application-relative URL:

```json
{"url":"/storage/editor/example.webp"}
```

Application-relative upload responses are normalized to an absolute URL using the upload endpoint origin before insertion. The endpoint, validation, authorization, storage, and cleanup remain application responsibilities. Without `image-upload-url`, the dialog uses Image URL. Both modes require non-empty alternative text for new images.

The submitted `content` value is HTML. For safe persistence, add the package cast:

```php
use Arm092\RichTextEditor\Casts\RichTextCast;

protected function casts(): array
{
    return [
        'content' => RichTextCast::class,
    ];
}
```

Laravel 10 applications should place the same entry in the model's protected
`$casts` property.

Render saved content through the defensive renderer:

```blade
<x-rich-text-content :content="$post->content" />
```

## Livewire

```blade
<x-rich-text-editor wire:model="form.content" label="Content" />
```

The component synchronizes through a native textarea and isolates the editor-managed DOM with `wire:ignore`. Default, `.live`, `.blur`, and `.change` model modifiers pass through unchanged.

## Standalone JavaScript

Basic code view:

```html
<script src="/vendor/rich-text-editor/rich-text-editor.js" defer></script>
<div data-rich-text-editor></div>
```

Enhanced code view:

```html
<script src="/vendor/rich-text-editor/rich-text-editor-with-code.js" defer></script>
<div id="editor"></div>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        window.editor = RichTextEditor.create('#editor')
    })
</script>
```

Both files expose the same API: `create`, `scan`, `destroy`, `getHTML`, `setHTML`, `focus`, `setReadOnly`, and instance `destroy`.

## Common configuration

| Option | Default | Purpose |
| --- | --- | --- |
| `default_profile` | `standard` | Selects the formatting and sanitizer profile. |
| `code_view.enabled` | `true` | Shows the HTML code-view command. |
| `code_view.enhanced` | `true` | Loads the enhanced or basic browser bundle. |
| `assets.auto` | `true` | Lets the Blade component include published assets once. |
| `profiles.*.headings` | `[2, 3, 4]` | Restricts heading levels. |
| `profiles.*.text_alignments` | Left, center, right, justify | Enables CSP-safe block text alignment. |
| `profiles.*.font_sizes` | `[]` | Enables only named, allowlisted text sizes. |
| `profiles.*.colors` | Tailwind `500` palette | Enables allowlisted text and background colors. |
| `profiles.*.images.resize` | `20–100`, step `5` | Controls safe responsive image resizing. |
| `profiles.*.tables.enabled` | `true` in `standard` | Enables responsive tables and their toolbar. |
| `profiles.*.tables.palette` | Eight legacy theme tokens | Keeps previously stored table-cell colors valid; new cell colors use `profiles.*.colors`. |

Enabled tables can be resized from 20% through 100% without additional configuration and aligned left, center, or right. Their canonical `data-rte-width` and `data-rte-table-align` HTML remains compatible with strict CSP policies. Table-cell colors use the same Tailwind `500` swatches as the main color picker.

## Roadmap

- Visual-editor dark theme with `light`, `dark`, and `auto` modes
- Additional interface translations
- npm publishing with ESM modules
- A documented extension registry

See the [full roadmap](docs/roadmap.md) for scope notes and exclusions.

## Documentation

- [Installation and updates](docs/installation.md)
- [Blade and Livewire](docs/blade.md)
- [Standalone JavaScript](docs/standalone.md)
- [Configuration and profiles](docs/configuration.md)
- [Code view](docs/code-view.md)
- [Security, casting, and rendering](docs/security.md)
- [JavaScript API and events](docs/javascript-api.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

Laravel Rich Text Editor is open-source software released under the [MIT License](LICENSE.md).
