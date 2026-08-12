<?php

namespace Arm092\RichTextEditor\Tests\Unit;

use Arm092\RichTextEditor\Rules\RichTextRule;
use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;

class RichTextRuleTest extends TestCase
{
    #[DataProvider('safeLinksWithoutRel')]
    public function test_it_accepts_links_that_only_require_mandatory_rel_canonicalization(string $html): void
    {
        $this->assertTrue(Validator::make(['content' => $html], ['content' => [new RichTextRule()]])->passes());
    }

    public static function safeLinksWithoutRel(): array
    {
        return [
            'http' => ['<p><a href="https://example.com/docs">Documentation</a></p>'],
            'mailto' => ['<p><a href="mailto:support@apricode.am">Email support</a></p>'],
        ];
    }

    public function test_it_accepts_safe_editor_html_when_the_sanitizer_reorders_link_attributes(): void
    {
        $html = '<p><a target="_blank" rel="noopener noreferrer" href="mailto:support@apricode.am">Email support</a></p>';

        $this->assertTrue(Validator::make(['content' => $html], ['content' => [new RichTextRule()]])->passes());
    }

    #[DataProvider('unsafeHtml')]
    public function test_it_still_rejects_unsafe_or_unsupported_html(string $html): void
    {
        $this->assertFalse(Validator::make(['content' => $html], ['content' => [new RichTextRule()]])->passes());
    }

    public static function unsafeHtml(): array
    {
        return [
            'javascript URL' => ['<p><a href="javascript:alert(1)">Unsafe</a></p>'],
            'event handler' => ['<p><a href="https://example.com" onclick="alert(1)">Unsafe</a></p>'],
            'script element' => ['<p>Safe</p><script>alert(1)</script>'],
            'unsupported attribute' => ['<p class="unexpected">Unsafe</p>'],
        ];
    }

    public function test_it_accepts_canonical_table_html(): void
    {
        $html = '<table><tbody><tr><th scope="col"><p>Header</p></th></tr><tr><td><p>Value</p></td></tr></tbody></table>';

        $this->assertTrue(Validator::make(['content' => $html], ['content' => [new RichTextRule()]])->passes());
    }

    public function test_it_rejects_table_html_that_requires_destructive_sanitization(): void
    {
        $html = '<table border="1"><tr><td data-rte-text-color="unknown"><p>Value</p></td></tr></table>';

        $this->assertFalse(Validator::make(['content' => $html], ['content' => [new RichTextRule()]])->passes());
    }
}
