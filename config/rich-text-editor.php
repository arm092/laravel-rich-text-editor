<?php

return [
    'assets' => ['auto' => true, 'path' => 'vendor/rich-text-editor'],
    'default_profile' => 'standard',
    'code_view' => [
        'enabled' => true,
        'enhanced' => true,
        'line_numbers' => true,
        'line_wrapping' => true,
        'folding' => true,
        'autocomplete' => true,
        'diagnostics' => true,
        'format_button' => true,
        'fullscreen' => true,
        'tab_size' => 2,
    ],
    'theme' => [
        'primary' => '#FD971F',
        'success' => '#A6E22E',
        'error' => '#F92672',
        'info' => '#66D9EF',
        'graphite' => '#272822',
        'ink' => '#060606',
        'paper' => '#F8F8F2',
        'white' => '#FFFFFF',
    ],
    'profiles' => [
        'standard' => [
            'headings' => [2, 3, 4],
            'toolbar' => [
                'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'underline', 'strike',
                'code', '|', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'horizontalRule',
                '|', 'link', 'image', 'clearFormatting', '|', 'codeView',
                '|', 'table',
            ],
            'font_sizes' => [],
            'links' => ['schemes' => ['http', 'https', 'mailto', 'tel'], 'allow_relative' => true],
            'images' => [
                'schemes' => ['http', 'https'],
                'alignments' => ['left', 'center', 'right'],
                'resize' => ['enabled' => true, 'min' => 20, 'max' => 100, 'step' => 5],
            ],
            'tables' => [
                'enabled' => true,
                'horizontal_alignments' => ['left', 'center', 'right'],
                'vertical_alignments' => ['top', 'middle', 'bottom'],
                'scopes' => ['row', 'col', 'rowgroup', 'colgroup'],
                'max_span' => 100,
                'palette' => ['primary', 'success', 'error', 'info', 'graphite', 'ink', 'paper', 'white'],
            ],
            'max_characters' => null,
        ],
        'minimal' => [
            'headings' => [2, 3],
            'toolbar' => [
                'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', '|',
                'bulletList', 'orderedList', '|', 'link', 'image', '|', 'codeView',
            ],
            'font_sizes' => [],
            'links' => ['schemes' => ['http', 'https', 'mailto', 'tel'], 'allow_relative' => true],
            'images' => [
                'schemes' => ['http', 'https'],
                'alignments' => ['left', 'center', 'right'],
                'resize' => ['enabled' => true, 'min' => 20, 'max' => 100, 'step' => 5],
            ],
            'tables' => ['enabled' => false],
            'max_characters' => null,
        ],
    ],
];
