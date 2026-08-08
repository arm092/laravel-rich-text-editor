<?php

namespace Arm092\RichTextEditor\View\Components;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class RichTextContent extends Component
{
    public readonly ?string $sanitizedContent;

    public function __construct(RichTextSanitizer $sanitizer, ?string $content = null, ?string $profile = null)
    {
        $this->sanitizedContent = $sanitizer->sanitize($content, $profile);
    }

    public function render(): View
    {
        return view('rich-text-editor::components.content');
    }
}
