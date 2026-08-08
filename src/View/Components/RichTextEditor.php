<?php

namespace Arm092\RichTextEditor\View\Components;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class RichTextEditor extends Component
{
    public readonly string $editorId;

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
        ?string $id = null,
    ) {
        $this->profile ??= config('rich-text-editor.default_profile', 'standard');
        $this->editorId = $id ?: 'rte-'.str()->uuid();
        $profileSettings = $sanitizer->profile($this->profile);
        $this->editorOptions = [
            'profile' => $this->profile,
            'placeholder' => $this->placeholder,
            'readonly' => $this->readonly,
            'disabled' => $this->disabled,
            'minHeight' => $this->minHeight,
            'toolbar' => $profileSettings['toolbar'] ?? [],
            'headings' => $profileSettings['headings'] ?? [2, 3, 4],
            'fontSizes' => $profileSettings['font_sizes'] ?? [],
            'links' => $profileSettings['links'] ?? [],
            'images' => $profileSettings['images'] ?? [],
            'codeView' => config('rich-text-editor.code_view', []),
            'theme' => config('rich-text-editor.theme', []),
        ];
    }

    public function render(): View
    {
        return view('rich-text-editor::components.editor');
    }
}
