# Installation and updating

Install the package from Packagist and publish its configuration and prebuilt assets:

```bash
composer require arm092/laravel-rich-text-editor
php artisan rich-text-editor:publish
```

Composer package discovery registers the service provider, Blade components, sanitizer, and command. Node.js is not required in the consuming application.

## Publish groups

```bash
php artisan vendor:publish --tag=rich-text-editor-config
php artisan vendor:publish --tag=rich-text-editor-assets --force
php artisan vendor:publish --tag=rich-text-editor-views
php artisan vendor:publish --tag=rich-text-editor-lang
```

After a package update, review the changelog, back up customized assets, and republish assets with `--force`. Do not blindly overwrite a customized config or view.
