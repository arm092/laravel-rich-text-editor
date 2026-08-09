<?php

namespace Arm092\RichTextEditor\Tests\Unit;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Arm092\RichTextEditor\Tests\TestCase;
use InvalidArgumentException;

class RichTextSanitizerTest extends TestCase
{
    public function test_it_preserves_supported_semantic_html(): void
    {
        $html = '<h2>Title</h2><p>Hello <strong>world</strong>.</p><ul><li>One</li></ul>';

        $this->assertSame($html, app(RichTextSanitizer::class)->sanitize($html));
    }

    public function test_it_preserves_cyrillic_and_armenian_text_inside_html(): void
    {
        $html = '<p>Русский Հայերեն</p>';

        $this->assertSame($html, app(RichTextSanitizer::class)->sanitize($html, 'standard'));
    }

    public function test_it_removes_scripts_events_and_unsafe_urls(): void
    {
        $html = '<script>alert(1)</script><p onclick="alert(1)">Safe</p><a href="javascript:alert(1)" target="_blank">Link</a>';
        $sanitized = app(RichTextSanitizer::class)->sanitize($html);

        $this->assertStringNotContainsString('script', $sanitized);
        $this->assertStringNotContainsString('onclick', $sanitized);
        $this->assertStringNotContainsString('javascript:', $sanitized);
        $this->assertStringContainsString('rel="noopener noreferrer"', $sanitized);
    }

    public function test_it_restricts_headings_and_image_attributes_by_profile(): void
    {
        $html = '<h1>Blocked heading</h1><h2>Allowed heading</h2><img src="https://example.com/a.jpg" alt="A" data-rte-align="wide">';
        $sanitized = app(RichTextSanitizer::class)->sanitize($html, 'standard');

        $this->assertStringNotContainsString('<h1>', $sanitized);
        $this->assertStringContainsString('<h2>', $sanitized);
        $this->assertStringNotContainsString('data-rte-align', $sanitized);
    }

    public function test_it_removes_images_without_an_explicit_alt_attribute(): void
    {
        $sanitized = app(RichTextSanitizer::class)->sanitize('<p>Before</p><img src="https://example.com/a.jpg"><p>After</p>');

        $this->assertSame('<p>Before</p><p>After</p>', $sanitized);
    }

    public function test_it_allows_only_profile_constrained_responsive_image_widths(): void
    {
        $sanitizer = app(RichTextSanitizer::class);

        $this->assertSame(
            '<img src="https://example.com/a.jpg" alt="A" style="width: 60%;">',
            $sanitizer->sanitize('<img src="https://example.com/a.jpg" alt="A" style="width:60%">'),
        );
        $this->assertSame(
            '<img src="https://example.com/a.jpg" alt="A">',
            $sanitizer->sanitize('<img src="https://example.com/a.jpg" alt="A" style="width: 61%; color: red">'),
        );
    }

    public function test_it_removes_image_widths_when_resizing_is_disabled(): void
    {
        config()->set('rich-text-editor.profiles.standard.images.resize.enabled', false);
        $sanitizer = new RichTextSanitizer(
            config('rich-text-editor.profiles'),
            config('rich-text-editor.default_profile'),
        );

        $this->assertSame(
            '<img src="https://example.com/a.jpg" alt="A">',
            $sanitizer->sanitize('<img src="https://example.com/a.jpg" alt="A" style="width: 60%;">'),
        );
    }

    public function test_it_preserves_canonical_table_structure_and_cell_attributes(): void
    {
        $html = '<table><tbody><tr><th scope="col" data-rte-horizontal-align="center" data-rte-text-color="error"><p>Русский</p></th><th scope="col"><p>Հայերեն</p></th></tr><tr><td colspan="2" rowspan="2" data-rte-vertical-align="middle" data-rte-background-color="paper"><p>Value</p></td></tr></tbody></table>';

        $this->assertSame($html, app(RichTextSanitizer::class)->sanitize($html, 'standard'));
    }

    public function test_it_canonicalizes_legacy_table_attributes_and_palette_hex_colors(): void
    {
        $html = '<table border="1" cellpadding="4" cellspacing="2" class="legacy" style="width:100%"><tr><th align="RIGHT" valign="TOP" bgcolor="#f8f8f2" style="color:#F92672; width: 200px" nowrap scope="COL"><p>Header</p></th></tr></table>';
        $sanitized = app(RichTextSanitizer::class)->sanitize($html, 'standard');

        $this->assertSame('<table><tbody><tr><th scope="col" data-rte-horizontal-align="right" data-rte-vertical-align="top" data-rte-text-color="error" data-rte-background-color="paper"><p>Header</p></th></tr></tbody></table>', $sanitized);
    }

    public function test_it_removes_invalid_table_values_and_tables_from_minimal_profile(): void
    {
        $html = '<table><tbody><tr><td colspan="101" rowspan="0" class="bad" width="20" height="20" data-rte-horizontal-align="wide" data-rte-text-color="magenta"><p>Cell</p></td></tr></tbody></table>';
        $sanitizer = app(RichTextSanitizer::class);

        $this->assertSame('<table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>', $sanitizer->sanitize($html, 'standard'));
        $this->assertSame('', $sanitizer->sanitize($html, 'minimal'));
    }

    public function test_it_normalizes_empty_content_and_preserves_null(): void
    {
        $sanitizer = app(RichTextSanitizer::class);

        $this->assertSame('', $sanitizer->sanitize('<p><br></p>'));
        $this->assertNull($sanitizer->sanitize(null));
        $this->assertNotSame('', $sanitizer->sanitize('<hr>'));
        $this->assertSame('<table><tbody><tr><td><p></p></td></tr></tbody></table>', $sanitizer->sanitize('<table><tbody><tr><td><p></p></td></tr></tbody></table>'));
    }

    public function test_it_rejects_unknown_profiles(): void
    {
        $this->expectException(InvalidArgumentException::class);
        app(RichTextSanitizer::class)->sanitize('<p>Text</p>', 'missing');
    }
}
