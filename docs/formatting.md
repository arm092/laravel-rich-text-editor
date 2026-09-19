# Toolbar and formatting

The standard profile includes undo, redo, headings H2–H4, bold, italic, underline, strikethrough, lists, blockquotes, horizontal rules, links, URL images, text and background colors, tables, clear formatting, and code view. Inline code and code blocks remain available as the `code` and `codeBlock` toolbar entries for custom profiles but are disabled by default.

The color picker applies allowlisted Tailwind `text-{color}-500` and `bg-{color}-500` classes to selected text. Each section includes a reset action. Colors survive visual/code-view switching and safe server rendering without permitting arbitrary classes or inline styles.

Links support relative URLs plus HTTP, HTTPS, mailto, and tel by default. Links opened in a new tab receive `noopener noreferrer`. Images accept HTTP or HTTPS URLs, require alternative text in the visual insertion dialog, and support left, center, and right alignment. Existing code-view HTML may still use an explicit empty `alt` for a decorative image.

## Image uploads

Pass `image-upload-url` to the Blade component to replace the URL field with a JPEG, PNG, or WebP file field. The editor uploads only when the user presses Apply. It sends multipart form data under the `image` key with same-origin credentials and uses the CSRF token from the page meta tag. The endpoint must return JSON with a non-empty `url`; absolute URLs and application-relative paths such as `/storage/image.webp` are supported. Relative upload responses are normalized against the upload endpoint origin before insertion.

Laravel `422` responses may return `errors.image[0]`; other failures may return `message`. Network failures, malformed JSON, unsuccessful HTTP responses, and missing URLs remain visible in the dialog so the user can retry. The package intentionally provides no storage driver, file manager, route, controller, or database model.

## Responsive image resizing

Select an image and drag its lower-right resize handle. Widths are percentages, so images remain responsive when the content container changes. The handle is also keyboard accessible: use the arrow keys to resize by one configured step, or Home and End to select the minimum and maximum width.

The standard profile permits widths from 20% through 100% in 5% increments. The browser and PHP sanitizer both reject widths outside the active profile. A canonical, package-controlled `width: N%;` declaration is the only inline image style accepted; all other inline styles are removed.

File uploads and a media manager remain outside the package scope.

## Tables

The Table dropdown inserts either a 3 × 3 or 4 × 4 table. Both options create one header row; the remaining rows use body cells. When the cursor is in a table, it can add or remove rows and columns, toggle the current row between header and body cells, merge or split selected cells, and delete the table.

The same dropdown controls table width and whole-table horizontal alignment. The controls labelled `Text horizontal alignment` and `Text vertical alignment` affect content inside the selected cell, not the table itself. Cell text and background colors use the same Tailwind `500` swatch dialog and active profile palette as the main color picker. Reset removes the corresponding attribute. Header cells created by the editor use `scope="col"`.

Every enabled table can be resized from 20% through 100% in 5% increments by dragging its right-edge handle, using the keyboard, or selecting an exact width. Choose `Full width` in the width selector to restore the responsive default. Reduced widths are stored as a CSP-safe `data-rte-width` attribute; full width omits the attribute. Reduced-width tables store optional alignment as `data-rte-table-align`.

Use Tab and Shift+Tab to move between cells. Tables scroll horizontally inside their content container on narrow screens instead of widening the page.
