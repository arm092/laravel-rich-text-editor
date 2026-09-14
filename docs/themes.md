# Themes and colors

The visual editor is light in `0.1.x`. Override its scoped variables in application CSS:

```css
.rich-text-editor {
    --rte-primary: #FD971F;
    --rte-error: #F92672;
}
```

The same values may be changed in the published PHP config, which applies variables per component. The enhanced code view remains dark for readability. A complete visual-editor dark theme with `light`, `dark`, and `auto` modes is planned.

## Tailwind color picker

The standard profile detects `--color-*-500` variables declared by the host application's Tailwind theme and offers only those colors. When no matching theme variables exist, the complete standard Tailwind `500` palette is available through package CSS fallbacks.

Saved HTML uses `text-{color}-500` and `bg-{color}-500` classes. For a custom color such as `brand`, add `brand` to `profiles.*.colors.palette` and ensure Tailwind emits the corresponding utilities. With Tailwind CSS 4, include the package templates or your integration file as an `@source` when the utilities are not otherwise discoverable:

```css
@source "../../vendor/arm092/laravel-rich-text-editor/resources/views/**/*.blade.php";
@source inline("text-brand-500 bg-brand-500");
```
