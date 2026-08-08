# Upgrading

Read `CHANGELOG.md`, update Composer, then republish assets:

```bash
composer update arm092/laravel-rich-text-editor
php artisan rich-text-editor:publish --force
```

Review custom config and view overrides before replacing them. Pre-1 releases may introduce documented breaking changes in minor versions; migrations and upgrade notes will be called out explicitly.
