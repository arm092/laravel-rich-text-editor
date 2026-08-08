# Themes and colors

The visual editor is light in `0.1.x`. Override its scoped variables in application CSS:

```css
.rich-text-editor {
    --rte-primary: #FD971F;
    --rte-error: #F92672;
}
```

The same values may be changed in the published PHP config, which applies variables per component. The enhanced code view remains dark for readability. A complete visual-editor dark theme with `light`, `dark`, and `auto` modes is planned.
