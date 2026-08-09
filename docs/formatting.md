# Toolbar and formatting

The standard profile includes undo, redo, headings H2–H4, bold, italic, underline, strikethrough, inline code, lists, blockquotes, code blocks, horizontal rules, links, URL images, clear formatting, and code view.

Links support relative URLs plus HTTP, HTTPS, mailto, and tel by default. Links opened in a new tab receive `noopener noreferrer`. Images accept HTTP or HTTPS URLs, require alternative text or an explicit decorative choice, and support left, center, and right alignment.

## Responsive image resizing

Select an image and drag its lower-right resize handle. Widths are percentages, so images remain responsive when the content container changes. The handle is also keyboard accessible: use the arrow keys to resize by one configured step, or Home and End to select the minimum and maximum width.

The standard profile permits widths from 20% through 100% in 5% increments. The browser and PHP sanitizer both reject widths outside the active profile. A canonical, package-controlled `width: N%;` declaration is the only inline image style accepted; all other inline styles are removed.

File uploads and a media manager remain outside the package scope.
