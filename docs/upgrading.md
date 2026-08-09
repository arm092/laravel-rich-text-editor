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
