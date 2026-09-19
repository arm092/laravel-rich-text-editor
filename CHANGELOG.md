# Changelog

All notable changes to this project are documented in this file. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

## [1.3.5] - 2026-09-19

### Added

- Add 4 × 4 table insertion and left, center, or right alignment for reduced-width tables.
- Add profile-controlled left, center, right, and justified text alignment for selected paragraphs and headings.

### Changed

- Clarify that horizontal and vertical alignment controls affect text inside the selected cell.
- Use the same Tailwind `500` swatch dialog and active profile palette for ordinary text and table-cell colors.
- Remove the duplicate `Full width` action; full width remains available in the table-width selector.

### Fixed

- Center the image and clear-formatting SVG icons inside their toolbar buttons.

## [1.3.4] - 2026-09-19

### Changed

- Replace the `Tx` clear-formatting glyph with a monochrome eraser icon that remains distinct from image and code controls.

### Fixed

- Keep the table tools menu inside the editor when the toolbar wraps, preventing host layouts from clipping it beneath adjacent navigation.

## [1.3.3] - 2026-09-19

### Changed

- Replace the ambiguous image toolbar glyph with a consistent monochrome photo icon that remains distinct from the table control.

## [1.3.2] - 2026-09-19

### Fixed

- Normalize application-relative upload responses against the upload endpoint origin before inserting them, keeping uploaded images stable through client and server sanitization.
- Add a symmetric `images.allow_relative` policy to the browser and PHP sanitizers for applications that intentionally store relative image URLs.

## [1.3.1] - 2026-09-19

### Added

- Add optional generic image uploads through the `image-upload-url` Blade prop with multipart submission, CSRF support, loading feedback, Laravel validation errors, and retry handling.

### Changed

- Keep URL insertion as the fallback when no upload endpoint is configured.
- Require alternative text for both URL and uploaded images; the removed decorative-image checkbox remains unavailable.

## [1.3.0] - 2026-09-19

### Added

- Add CSP-safe table resizing from 20% through 100% with pointer, touch, keyboard, exact-width, and `Full width` controls whenever tables are enabled.

### Changed

- Store reduced table widths as allowlisted `data-rte-width` values and keep full width as the canonical default without an attribute.
- Remove the decorative-image checkbox from the visual image dialog and require alternative text for newly inserted images while preserving existing `alt=""` content.

## [1.2.2] - 2026-09-14

### Changed

- Remove inline code and code blocks from the default `standard` toolbar while keeping them available through custom profiles, and give HTML code view an unambiguous text label.

### Fixed

- Add native tooltips to the table and color picker toolbar buttons.

### Notes

- Published application configuration is not overwritten during Composer updates. Existing installations must merge the `colors` toolbar entry and `profiles.*.colors` settings or intentionally republish configuration with `rich-text-editor:publish --force` to enable the default color picker.

## [1.2.1] - 2026-09-14

### Fixed

- Use stable sRGB fallbacks for Tailwind color swatches so committed browser bundles build byte-for-byte identically on Windows and Linux.

## [1.2.0] - 2026-09-14

### Added

- Add a theme-aware text and background color picker that stores safe, allowlisted Tailwind `500` utility classes and falls back to the standard Tailwind palette when the host theme declares no colors.

## [1.1.10] - 2026-08-13

### Fixed

- Normalize Windows and legacy HTML line endings before `RichTextRule` structural comparison while preserving meaningful whitespace and unsafe HTML rejection.

## [1.1.9] - 2026-08-13

### Fixed

- Resolve the package asset fallback outside compiled Blade view paths so cache-busted auto assets work before publishing and across the full Laravel matrix.

## [1.1.8] - 2026-08-13

### Fixed

- Add stable cache-busting fingerprints to automatically loaded JS and CSS asset URLs, including CDN and subdirectory deployments.

## [1.1.7] - 2026-08-13

### Fixed

- Enable instance-level Livewire lifecycle synchronization only for editors with an explicit `wire:model` binding.

## [1.1.6] - 2026-08-13

### Fixed

- Synchronize dirty code view HTML during the submit capture phase so Livewire and other form listeners receive the current value on the first submission.

## [1.1.5] - 2026-08-12

### Fixed

- Compare sanitized HTML structurally in `RichTextRule` so safe attribute reordering does not block the first form submission.

## [1.1.4] - 2026-08-12

### Fixed

- Keep the text style control synchronized with the heading at the current selection.

## [1.1.3] - 2026-08-12

### Fixed

- Allow `RichTextRule` to accept safe HTTP and mailto links when sanitization only adds the mandatory `rel="noopener noreferrer"` attribute, while continuing to reject destructive unsafe or unsupported changes.

## [1.1.2] - 2026-08-10

### Fixed

- Keep unordered, ordered, and nested list markers visible when the host application resets list styles outside the package CSS layer.

## [1.1.1] - 2026-08-09

### Fixed

- Preserve the editor border radius and sizing inside narrow flex and grid layouts while keeping table dropdowns unclipped.
- Fall back to the `standard` profile when the component profile and configured default are missing or empty.

## [1.1.0] - 2026-08-09

### Added

- Responsive tables with header cells, row and column operations, merge and split, keyboard navigation, cell alignment, and allowlisted palette colors.
- Symmetric browser and server canonicalization for legacy table HTML, safe spans, scope values, alignments, and palette tokens.

### Changed

- The `standard` profile enables tables by default; `minimal` continues to remove them.
- Published assets, configuration, security guidance, formatting documentation, and browser coverage now include responsive tables.

## [1.0.0] - 2026-08-09

### Added

- Responsive image drag-resize with percentage widths, profile constraints, mouse and keyboard controls, code-view diagnostics, and safe server rendering.

### Changed

- Declared the existing Blade, JavaScript, sanitization, casting, validation, and rendering APIs stable for the 1.x release line.

## [0.1.1] - 2026-08-09

### Fixed

- Preserve UTF-8 text, including Cyrillic and Armenian, during server-side HTML normalization, Eloquent casting, and Blade rendering.

## [0.1.0] - 2026-08-09

### Added

- Initial Laravel 10–13 package with Blade, Alpine.js, and optional Livewire integration.
- Tiptap-based visual editing and semantic HTML persistence.
- Basic and enhanced code-view bundles with a shared public API.
- Profile-driven PHP and browser sanitization, Eloquent cast, validation rule, and safe renderer.
- Publish command, configurable palette, tests, CI, and full English documentation.

[Unreleased]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.3.5...HEAD
[1.3.5]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.3.4...v1.3.5
[1.3.4]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.10...v1.2.0
[1.1.10]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.9...v1.1.10
[1.1.9]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/arm092/laravel-rich-text-editor/compare/v0.1.1...v1.0.0
[0.1.1]: https://github.com/arm092/laravel-rich-text-editor/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/arm092/laravel-rich-text-editor/releases/tag/v0.1.0
