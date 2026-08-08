# Troubleshooting

## The editor is unstyled

Run `php artisan rich-text-editor:publish --force`, verify the `/public/vendor/rich-text-editor` files, and clear cached views. When `assets.auto` is disabled, load `rich-text-editor.css` and exactly one JavaScript bundle manually.

## The value does not update in Livewire

Keep `wire:model` on `<x-rich-text-editor>` and do not place `wire:ignore` around the complete component. Confirm only one editor bundle is loaded.

## HTML disappears after saving

The cast and editor must use the same named profile. Check its heading, link, image, and font-size allowlists.
