<?php

namespace Arm092\RichTextEditor\Tests\Feature;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Arm092\RichTextEditor\View\Components\RichTextEditor;
use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Support\Facades\Blade;
use Illuminate\View\ComponentAttributeBag;

class BladeComponentsTest extends TestCase
{
    public function test_editor_component_renders_form_and_livewire_contracts(): void
    {
        $view = Blade::render('<x-rich-text-editor name="content" value="<p>Hello</p>" label="Content" wire:model="content" />');

        $this->assertStringContainsString('data-rich-text-editor', $view);
        $this->assertStringContainsString('data-rte-mount', $view);
        $this->assertStringContainsString('name="content"', $view);
        $this->assertStringContainsString('wire:model="content"', $view);
        $this->assertStringContainsString('data-rte-livewire', $view);
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

    public function test_plain_form_editor_does_not_enable_the_livewire_adapter(): void
    {
        $view = Blade::render('<x-rich-text-editor name="content" />');

        $this->assertStringNotContainsString('data-rte-livewire', $view);
    }

    public function test_auto_assets_use_content_fingerprints_with_the_configured_asset_url(): void
    {
        config()->set('app.asset_url', 'https://cdn.example.com/subdirectory');
        config()->set('rich-text-editor.assets.auto', true);
        $component = new RichTextEditor(app(RichTextSanitizer::class), name: 'content');
        $view = $component->render()
            ->with($component->data())
            ->with('assetSourcePath', $component->assetSourcePath)
            ->with('attributes', new ComponentAttributeBag())
            ->render();

        $this->assertMatchesRegularExpression('#href="https://cdn\.example\.com/subdirectory/vendor/rich-text-editor/rich-text-editor\.css\?v=[a-f0-9]+"#', $view);
        $this->assertMatchesRegularExpression('#src="https://cdn\.example\.com/subdirectory/vendor/rich-text-editor/rich-text-editor-with-code\.js\?v=[a-f0-9]+"#', $view);
    }

    public function test_content_component_preserves_cyrillic_and_armenian_text(): void
    {
        $view = Blade::render('<x-rich-text-content :content="$content" />', [
            'content' => '<p>Русский Հայերեն</p>',
        ]);

        $this->assertStringContainsString('<p>Русский Հայերեն</p>', $view);
    }

    public function test_content_component_renders_a_safe_responsive_image_width(): void
    {
        $view = Blade::render('<x-rich-text-content :content="$content" />', [
            'content' => '<img src="https://example.com/a.jpg" alt="A" style="width: 60%;">',
        ]);

        $this->assertStringContainsString('style="width: 60%;"', $view);
    }

    public function test_content_component_renders_responsive_canonical_tables(): void
    {
        $view = Blade::render('<x-rich-text-content :content="$content" profile="standard" />', [
            'content' => '<table><tbody><tr><th scope="col"><p>Русский Հայերեն</p></th></tr></tbody></table>',
        ]);

        $this->assertStringContainsString('<table><tbody><tr><th scope="col"><p>Русский Հայերեն</p></th></tr></tbody></table>', $view);
        $this->assertStringContainsString('class="rte-content"', $view);
    }

    public function test_custom_colors_and_code_view_options_are_serialized(): void
    {
        config()->set('rich-text-editor.theme.primary', '#123456');
        config()->set('rich-text-editor.code_view.enabled', false);
        $view = Blade::render('<x-rich-text-editor name="content" />');

        $this->assertStringContainsString('#123456', $view);
        $this->assertStringContainsString('"enabled":false', $view);
        $this->assertStringContainsString('"tables":{"enabled":true', $view);
    }

    public function test_missing_or_empty_profile_falls_back_to_standard(): void
    {
        config()->set('rich-text-editor.default_profile', null);

        $view = Blade::render('<x-rich-text-editor name="content" profile="" />');
        $content = Blade::render('<x-rich-text-content :content="$content" />', [
            'content' => '<table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>',
        ]);

        $this->assertStringContainsString('"profile":"standard"', $view);
        $this->assertStringContainsString('"tables":{"enabled":true', $view);
        $this->assertStringContainsString('<table><tbody>', $content);
    }
}
