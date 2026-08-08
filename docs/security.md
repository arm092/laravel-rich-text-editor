# HTML sanitization and security

Browser sanitization improves feedback but is not a server security boundary. Always sanitize HTML on the server before raw rendering.

The package uses Symfony HTML Sanitizer with the active profile. Scripts, event handlers, unsafe URL schemes, unlisted elements, arbitrary inline styles, invalid alignments, and unknown size tokens are removed. The renderer sanitizes defensively even when a cast is used.

For untrusted content, use `RichTextCast` on persistence and `<x-rich-text-content>` on output. Direct `{!! $content !!}` output is safe only when the application can independently prove the value was sanitized.
