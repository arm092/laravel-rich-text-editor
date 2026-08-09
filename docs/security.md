# HTML sanitization and security

Browser sanitization improves feedback but is not a server security boundary. Always sanitize HTML on the server before raw rendering.

The active profile controls server sanitization. Scripts, event handlers, unsafe URL schemes, unlisted elements, arbitrary inline styles, invalid alignments, and unknown size or color tokens are removed. Responsive images may contain only a canonical `width: N%;` style that matches the profile's minimum, maximum, and step. The renderer sanitizes defensively even when a cast is used.

In table cells, legacy `align`, `valign`, `bgcolor`, and supported style declarations are converted to canonical `data-rte-*` attributes. Only allowlisted palette tokens and alignments survive. `colspan` and `rowspan` are limited to integers from 1 through the configured maximum, with `1` omitted. Header `scope` is limited to `row`, `col`, `rowgroup`, or `colgroup`. Layout attributes including `border`, `cellpadding`, `cellspacing`, `nowrap`, `class`, `width`, `height`, and remaining styles are removed. The `minimal` profile removes tables completely.

For untrusted content, use `RichTextCast` on persistence and `<x-rich-text-content>` on output. Direct `{!! $content !!}` output is safe only when the application can independently prove the value was sanitized.
