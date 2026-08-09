# Upgrading

Read `CHANGELOG.md`, update Composer, then republish assets:

```bash
composer update arm092/laravel-rich-text-editor
php artisan rich-text-editor:publish --force
```

Review custom config and view overrides before replacing them.

## Upgrading from 0.1 to 1.0

Version 1.0 adds responsive image drag-resize. Republish the browser assets, then merge the new `images.resize` settings into every customized profile. Existing image HTML remains valid and unchanged until an image is resized.

The public Blade, JavaScript, cast, validation, sanitizer, and rendering APIs remain compatible with 0.1.x.

## Upgrading from 1.0 to 1.1

Version 1.1 adds responsive tables to the `standard` profile. Republish the browser assets, then merge `profiles.standard.tables` and `profiles.minimal.tables` from the package config into customized configuration files. Existing legacy table alignment and palette colors are canonicalized when sanitized; unsupported layout attributes and colors are removed.

The public APIs, `code_view.enhanced` option, publish command, and both browser bundle names remain unchanged.
