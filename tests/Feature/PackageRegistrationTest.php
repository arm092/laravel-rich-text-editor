<?php

namespace Arm092\RichTextEditor\Tests\Feature;

use Arm092\RichTextEditor\RichTextEditorServiceProvider;
use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\ServiceProvider;

class PackageRegistrationTest extends TestCase
{
    public function test_publish_command_is_registered(): void
    {
        $this->assertArrayHasKey('rich-text-editor:publish', Artisan::all());
    }

    public function test_all_documented_publish_groups_are_registered(): void
    {
        foreach (['rich-text-editor-config', 'rich-text-editor-assets', 'rich-text-editor-views', 'rich-text-editor-lang'] as $group) {
            $this->assertNotEmpty(ServiceProvider::pathsToPublish(RichTextEditorServiceProvider::class, $group));
        }
    }
}
