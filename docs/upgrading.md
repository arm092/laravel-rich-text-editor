# Upgrading

Read `CHANGELOG.md`, update Composer, then republish assets:

```bash
composer update arm092/laravel-rich-text-editor
php artisan rich-text-editor:publish --force
```

Composer does not overwrite `config/rich-text-editor.php`. If the configuration is customized, compare it with the package config and merge new toolbar entries and profile settings manually. In particular, the color picker introduced in 1.2 requires both the `colors` toolbar entry and the `profiles.*.colors` settings. Using `rich-text-editor:publish --force` replaces the published config as well as the assets, so preserve intentional customizations first.

Review custom config and view overrides before replacing them.

## Upgrading from 0.1 to 1.0

Version 1.0 adds responsive image drag-resize. Republish the browser assets, then merge the new `images.resize` settings into every customized profile. Existing image HTML remains valid and unchanged until an image is resized.

The public Blade, JavaScript, cast, validation, sanitizer, and rendering APIs remain compatible with 0.1.x.

## Upgrading from 1.0 to 1.1

Version 1.1 adds responsive tables to the `standard` profile. Republish the browser assets, then merge `profiles.standard.tables` and `profiles.minimal.tables` from the package config into customized configuration files. Existing legacy table alignment and palette colors are canonicalized when sanitized; unsupported layout attributes and colors are removed.

The public APIs, `code_view.enhanced` option, publish command, and both browser bundle names remain unchanged.

## Upgrading to 1.2

Version 1.2 adds the Tailwind theme color picker to the default `standard` profile. Existing published profiles remain unchanged until the `colors` toolbar entry and `colors` profile settings are merged or the config is republished with `--force`. Inline code and code blocks are no longer present in the default toolbar as of 1.2.2, but remain available by adding `code` or `codeBlock` to a custom toolbar.

## Upgrading to 1.3

Version 1.3 adds CSP-safe percentage resizing automatically whenever tables are enabled. No config merge is required. Republish JavaScript and CSS assets so the resize handle, exact-width control, `Full width` command, and static `data-rte-width` rules are available. The visual image dialog no longer offers a decorative-image checkbox and requires non-empty alternative text; existing stored images with an explicit empty `alt` remain valid.
