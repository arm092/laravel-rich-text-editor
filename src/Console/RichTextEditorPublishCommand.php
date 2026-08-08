<?php

namespace Arm092\RichTextEditor\Console;

use Arm092\RichTextEditor\RichTextEditorServiceProvider;
use Illuminate\Console\Command;

class RichTextEditorPublishCommand extends Command
{
    protected $signature = 'rich-text-editor:publish {--force : Overwrite existing configuration and assets}';
    protected $description = 'Publish the Laravel Rich Text Editor configuration and browser assets';

    public function handle(): int
    {
        foreach (['rich-text-editor-config', 'rich-text-editor-assets'] as $tag) {
            $arguments = ['--provider' => RichTextEditorServiceProvider::class, '--tag' => $tag];
            if ($this->option('force')) {
                $arguments['--force'] = true;
            }
            $this->call('vendor:publish', $arguments);
        }

        $this->components->info('Rich Text Editor configuration and assets are published.');

        return self::SUCCESS;
    }
}
