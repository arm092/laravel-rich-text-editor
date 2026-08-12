# Changelog

All notable changes to this project are documented in this file. The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.4...HEAD
[1.1.4]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/arm092/laravel-rich-text-editor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/arm092/laravel-rich-text-editor/compare/v0.1.1...v1.0.0
[0.1.1]: https://github.com/arm092/laravel-rich-text-editor/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/arm092/laravel-rich-text-editor/releases/tag/v0.1.0
