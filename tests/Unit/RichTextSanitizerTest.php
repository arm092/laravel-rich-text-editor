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

    public function test_it_normalizes_empty_content_and_preserves_null(): void
    {
        $sanitizer = app(RichTextSanitizer::class);

        $this->assertSame('', $sanitizer->sanitize('<p><br></p>'));
        $this->assertNull($sanitizer->sanitize(null));
        $this->assertNotSame('', $sanitizer->sanitize('<hr>'));
    }

    public function test_it_rejects_unknown_profiles(): void
    {
        $this->expectException(InvalidArgumentException::class);
        app(RichTextSanitizer::class)->sanitize('<p>Text</p>', 'missing');
    }
}
