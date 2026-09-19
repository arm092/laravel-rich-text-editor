# HTML sanitization and security

Browser sanitization improves feedback but is not a server security boundary. Always sanitize HTML on the server before raw rendering.

The active profile controls server sanitization. Scripts, event handlers, unsafe URL schemes, unlisted elements, arbitrary inline styles, invalid alignments, and unknown size or color tokens are removed. Responsive images may contain only a canonical `width: N%;` style that matches the profile's minimum, maximum, and step. The renderer sanitizes defensively even when a cast is used.

Image uploads use only the explicitly supplied application endpoint. The consuming application must authenticate and authorize the request, validate file content and size, generate safe filenames, store the file outside executable paths, and return a trusted URL. The browser sends the page CSRF token when present, but server-side CSRF verification remains mandatory.

Text spans may retain only `text-{color}-500` and `bg-{color}-500` classes whose color name appears in the active profile, plus `text-white` and `bg-white` when `white` is allowlisted. Other classes, arbitrary shades, and inline text styles are removed. This allowlist is enforced identically in browser diagnostics and PHP sanitization.

Paragraphs and allowed headings may retain only an allowlisted `data-rte-text-align` value. Legacy `text-align` declarations are converted to that canonical attribute; arbitrary block styles and unsupported alignment values are removed.

In table cells, legacy `align`, `valign`, `bgcolor`, and supported style declarations are converted to canonical `data-rte-*` attributes. Only colors from the active Tailwind palette, backward-compatible table palette tokens, and allowlisted cell alignments survive. `colspan` and `rowspan` are limited to integers from 1 through the configured maximum, with `1` omitted. Header `scope` is limited to `row`, `col`, `rowgroup`, or `colgroup`. A table may retain only a canonical `data-rte-width` value from 20 through 95 in increments of 5; full width omits it. Optional whole-table alignment is restricted to `left`, `center`, or `right` in `data-rte-table-align`. Layout attributes including `border`, `cellpadding`, `cellspacing`, `nowrap`, `class`, `width`, `height`, and remaining styles are removed. The `minimal` profile removes tables completely.

For untrusted content, use `RichTextCast` on persistence and `<x-rich-text-content>` on output. Direct `{!! $content !!}` output is safe only when the application can independently prove the value was sanitized.
