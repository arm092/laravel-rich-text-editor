<?php

namespace Arm092\RichTextEditor\View\Components;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class RichTextEditor extends Component
{
    public readonly string $editorId;
    public readonly string $assetSourcePath;

    /** @var array<string, mixed> */
    public readonly array $editorOptions;

    public function __construct(
        RichTextSanitizer $sanitizer,
        public ?string $name = null,
        public ?string $value = null,
        public ?string $profile = null,
        public ?string $label = null,
        public ?string $placeholder = null,
        public bool $required = false,
        public bool $readonly = false,
        public bool $disabled = false,
        public string $minHeight = '16rem',
        public ?string $error = null,
        public ?string $imageUploadUrl = null,
        ?string $id = null,
    ) {
        if ($this->profile === null || trim($this->profile) === '') {
            $configuredDefault = config('rich-text-editor.default_profile');
            $this->profile = is_string($configuredDefault) && trim($configuredDefault) !== ''
                ? $configuredDefault
                : 'standard';
        }
        $this->editorId = $id ?: 'rte-'.str()->uuid();
        $this->assetSourcePath = dirname(__DIR__, 3).'/dist';
        $profileSettings = $sanitizer->profile($this->profile);
        $this->editorOptions = [
            'profile' => $this->profile,
            'placeholder' => $this->placeholder,
            'readonly' => $this->readonly,
            'disabled' => $this->disabled,
            'minHeight' => $this->minHeight,
            'toolbar' => $profileSettings['toolbar'] ?? [],
            'headings' => $profileSettings['headings'] ?? [2, 3, 4],
            'textAlignments' => $profileSettings['text_alignments'] ?? [],
            'fontSizes' => $profileSettings['font_sizes'] ?? [],
            'colors' => $profileSettings['colors'] ?? ['enabled' => false, 'palette' => []],
            'links' => $profileSettings['links'] ?? [],
            'images' => array_filter([
                ...($profileSettings['images'] ?? []),
                'upload_url' => $this->imageUploadUrl,
            ], static fn (mixed $value): bool => $value !== null),
            'tables' => $profileSettings['tables'] ?? ['enabled' => false],
            'codeView' => config('rich-text-editor.code_view', []),
            'theme' => config('rich-text-editor.theme', []),
        ];
    }

    public function render(): View
    {
        return view('rich-text-editor::components.editor', ['assetSourcePath' => $this->assetSourcePath]);
    }
}
