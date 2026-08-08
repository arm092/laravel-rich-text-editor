# Standalone JavaScript

Use `rich-text-editor.js` for the smaller textarea-based code view or `rich-text-editor-with-code.js` for the enhanced code view. Each file is self-contained and injects its scoped default styles when an external `data-rte-styles` stylesheet is not present.

```html
<div id="editor"><textarea data-rte-input name="content"></textarea></div>
<script src="/vendor/rich-text-editor/rich-text-editor-with-code.js"></script>
<script>
    const editor = RichTextEditor.create('#editor', {
        placeholder: 'Write something useful…',
        codeView: { enabled: true },
    })
</script>
```

Add `data-rich-text-editor` for automatic initialization. Calling `scan()` repeatedly is safe because each element is initialized once.
