<?php

namespace Arm092\RichTextEditor\Tests\Feature;

use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Support\Facades\Blade;

class BladeComponentsTest extends TestCase
{
    public function test_editor_component_renders_form_and_livewire_contracts(): void
    {
        $view = Blade::render('<x-rich-text-editor name="content" value="<p>Hello</p>" label="Content" wire:model="content" />');

        $this->assertStringContainsString('data-rich-text-editor', $view);
        $this->assertStringContainsString('data-rte-mount', $view);
        $this->assertStringContainsString('name="content"', $view);
        $this->assertStringContainsString('wire:model="content"', $view);
        $this->assertStringContainsString('&lt;p&gt;Hello&lt;/p&gt;', $view);
        $this->assertStringContainsString('Content', $view);
    }

    public function test_content_component_sanitizes_raw_html_before_rendering(): void
    {
        $view = Blade::render('<x-rich-text-content :content="$content" />', [
            'content' => '<p>Safe</p><script>alert(1)</script>',
        ]);

        $this->assertStringContainsString('<p>Safe</p>', $view);
        $this->assertStringNotContainsString('<script>', $view);
    }

    public function test_content_component_preserves_cyrillic_and_armenian_text(): void
    {
        $view = Blade::render('<x-rich-text-content :content="$content" />', [
            'content' => '<p>Русский Հայերեն</p>',
        ]);

        $this->assertStringContainsString('<p>Русский Հայերեն</p>', $view);
    }

    public function test_custom_colors_and_code_view_options_are_serialized(): void
    {
        config()->set('rich-text-editor.theme.primary', '#123456');
        config()->set('rich-text-editor.code_view.enabled', false);
        $view = Blade::render('<x-rich-text-editor name="content" />');

        $this->assertStringContainsString('#123456', $view);
        $this->assertStringContainsString('"enabled":false', $view);
    }
}
