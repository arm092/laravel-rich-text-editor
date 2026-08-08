<?php

namespace Arm092\RichTextEditor\Tests\Feature;

use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Support\Facades\Blade;
use Livewire\Component;
use Livewire\Livewire;

class LivewireIntegrationTest extends TestCase
{
    public function test_editor_binds_to_a_livewire_property_and_survives_server_updates(): void
    {
        Livewire::test(EditorHost::class)
            ->assertSee('data-rich-text-editor', false)
            ->assertSee('wire:model="content"', false)
            ->set('content', '<p>Changed</p>')
            ->assertSet('content', '<p>Changed</p>')
            ->call('resetContent')
            ->assertSet('content', '<p>Reset</p>')
            ->assertSee('&lt;p&gt;Reset&lt;/p&gt;', false);
    }
}

class EditorHost extends Component
{
    public string $content = '<p>Initial</p>';

    public function resetContent(): void
    {
        $this->content = '<p>Reset</p>';
    }

    public function render(): string
    {
        return Blade::render('<div><x-rich-text-editor wire:model="content" :value="$content" /></div>', [
            'content' => $this->content,
        ]);
    }
}
