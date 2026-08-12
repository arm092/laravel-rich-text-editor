@php
    $wireModel = $attributes->whereStartsWith('wire:model');
    $errorBag = $errors ?? null;
    $fieldError = $error ?? ($name && $errorBag ? $errorBag->first($name) : null);
    $assetPath = trim(config('rich-text-editor.assets.path', 'vendor/rich-text-editor'), '/');
    $script = config('rich-text-editor.code_view.enhanced', true)
        ? 'rich-text-editor-with-code.js'
        : 'rich-text-editor.js';
@endphp

@if (config('rich-text-editor.assets.auto', true))
    @once
        @php
            $versionedAsset = static function (string $file) use ($assetPath, $assetSourcePath): string {
                $published = public_path($assetPath.'/'.$file);
                $source = $assetSourcePath.'/'.$file;
                $assetFile = is_file($published) ? $published : $source;
                $fingerprint = dechex(filemtime($assetFile)).dechex(filesize($assetFile));

                return asset($assetPath.'/'.$file).'?v='.$fingerprint;
            };
        @endphp
        <link rel="stylesheet" href="{{ $versionedAsset('rich-text-editor.css') }}" data-rte-styles>
        <script defer src="{{ $versionedAsset($script) }}" data-rte-script></script>
    @endonce
@endif

<div
    id="{{ $editorId }}"
    class="rich-text-editor{{ $fieldError ? ' rich-text-editor--invalid' : '' }}"
    data-rich-text-editor
    @if ($wireModel->isNotEmpty()) data-rte-livewire @endif
    data-rte-options='@json($editorOptions)'
    x-data="richTextEditor"
    {{ $attributes->except(['id', 'class'])->whereDoesntStartWith('wire:model') }}
>
    @if ($label)
        <label class="rte-label" for="{{ $editorId }}-input">{{ $label }}</label>
    @endif

    <textarea
        id="{{ $editorId }}-input"
        class="rte-native-input"
        data-rte-input
        @if ($name) name="{{ $name }}" @endif
        @if ($required) required @endif
        @if ($disabled) disabled @endif
        {{ $wireModel }}
    >{{ $value }}</textarea>

    <div data-rte-mount wire:ignore></div>

    @if ($fieldError)
        <p class="rte-field-error" data-rte-field-error>{{ $fieldError }}</p>
    @endif
</div>
