<?php

namespace Arm092\RichTextEditor\Tests\Unit;

use Arm092\RichTextEditor\Rules\RichTextRule;
use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Support\Facades\Validator;

class RichTextRuleTest extends TestCase
{
    public function test_it_accepts_canonical_table_html(): void
    {
        $html = '<table><tbody><tr><th scope="col"><p>Header</p></th></tr><tr><td><p>Value</p></td></tr></tbody></table>';

        $this->assertTrue(Validator::make(['content' => $html], ['content' => [new RichTextRule('standard')]])->passes());
    }

    public function test_it_rejects_table_html_that_requires_destructive_sanitization(): void
    {
        $html = '<table border="1"><tr><td data-rte-text-color="unknown"><p>Value</p></td></tr></table>';

        $this->assertFalse(Validator::make(['content' => $html], ['content' => [new RichTextRule('standard')]])->passes());
    }
}
