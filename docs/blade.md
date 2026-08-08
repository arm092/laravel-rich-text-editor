# Blade usage

The editor is a form control backed by a native textarea:

```blade
<x-rich-text-editor name="content" :value="old('content', $post->content)" />
```

Supported component properties include `id`, `name`, `value`, `profile`, `label`, `placeholder`, `required`, `readonly`, `disabled`, `min-height`, and `error`. Unknown safe attributes are forwarded to the root element.

Validation messages are discovered from Laravel's error bag by `name`, or may be supplied through the `error` property. Use `<x-rich-text-content>` to render saved HTML with the matching content styles and defensive sanitization.
