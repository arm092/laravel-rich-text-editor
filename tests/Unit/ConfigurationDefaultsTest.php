<?php

namespace Arm092\RichTextEditor\Tests\Unit;

use PHPUnit\Framework\TestCase;

class ConfigurationDefaultsTest extends TestCase
{
    public function test_standard_profile_enables_colors_and_disables_code_formatting_by_default(): void
    {
        $config = require dirname(__DIR__, 2).'/config/rich-text-editor.php';
        $standard = $config['profiles']['standard'];

        $this->assertTrue($standard['colors']['enabled']);
        $this->assertContains('colors', $standard['toolbar']);
        $this->assertContains('textAlign', $standard['toolbar']);
        $this->assertSame(['left', 'center', 'right', 'justify'], $standard['text_alignments']);
        $this->assertNotContains('code', $standard['toolbar']);
        $this->assertNotContains('codeBlock', $standard['toolbar']);
    }
}
