<?php

namespace Arm092\RichTextEditor;

use Arm092\RichTextEditor\Console\RichTextEditorPublishCommand;
use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Arm092\RichTextEditor\View\Components\RichTextContent;
use Arm092\RichTextEditor\View\Components\RichTextEditor;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class RichTextEditorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/rich-text-editor.php', 'rich-text-editor');
        $this->app->singleton(RichTextSanitizer::class, fn ($app) => new RichTextSanitizer(
            $app['config']->get('rich-text-editor.profiles', []),
            $app['config']->get('rich-text-editor.default_profile', 'standard'),
        ));
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'rich-text-editor');
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'rich-text-editor');
        Blade::component('rich-text-editor', RichTextEditor::class);
        Blade::component('rich-text-content', RichTextContent::class);

        $this->publishes([__DIR__.'/../config/rich-text-editor.php' => config_path('rich-text-editor.php')], 'rich-text-editor-config');
        $this->publishes([__DIR__.'/../dist' => public_path('vendor/rich-text-editor')], 'rich-text-editor-assets');
        $this->publishes([__DIR__.'/../resources/views' => resource_path('views/vendor/rich-text-editor')], 'rich-text-editor-views');
        $this->publishes([__DIR__.'/../resources/lang' => $this->app->langPath('vendor/rich-text-editor')], 'rich-text-editor-lang');

        if ($this->app->runningInConsole()) {
            $this->commands([RichTextEditorPublishCommand::class]);
        }
    }
}
