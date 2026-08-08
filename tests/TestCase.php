<?php

namespace Arm092\RichTextEditor\Tests;

use Arm092\RichTextEditor\RichTextEditorServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;
use Livewire\LivewireServiceProvider;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [LivewireServiceProvider::class, RichTextEditorServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
        $app['config']->set('rich-text-editor.assets.auto', false);
    }
}
