<?php

namespace Arm092\RichTextEditor\Sanitization;

use DOMDocument;
use DOMElement;
use DOMXPath;
use InvalidArgumentException;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

class RichTextSanitizer
{
    /** @param array<string, array<string, mixed>> $profiles */
    public function __construct(
        private readonly array $profiles,
        private readonly string $defaultProfile = 'standard',
        private readonly array $palette = [],
    )
    {
    }

    public function sanitize(?string $html, ?string $profile = null): ?string
    {
        if ($html === null) {
            return null;
        }

        $settings = $this->profile($profile);
        $html = $this->normalizeTableInput($html, $settings);
        $sanitized = (new HtmlSanitizer($this->configuration($settings)))->sanitize($html);
        $sanitized = $this->normalizeRestrictedAttributes($sanitized, $settings);

        return $this->isVisuallyEmpty($sanitized) ? '' : trim($sanitized);
    }

    /** @return array<string, mixed> */
    public function profile(?string $profile = null): array
    {
        $name = $profile ?: $this->defaultProfile;
        if (! isset($this->profiles[$name])) {
            throw new InvalidArgumentException("Unknown rich text profile [{$name}].");
        }

        return $this->profiles[$name];
    }

    /** @param array<string, mixed> $settings */
    private function configuration(array $settings): HtmlSanitizerConfig
    {
        $config = new HtmlSanitizerConfig();
        foreach (['p', 'br', 'strong', 'em', 'u', 's', 'code', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr'] as $element) {
            $config = $config->allowElement($element);
        }
        foreach ($settings['headings'] ?? [] as $level) {
            $config = $config->allowElement('h'.(int) $level);
        }
        if ($settings['tables']['enabled'] ?? false) {
            $config = $config
                ->allowElement('table')
                ->allowElement('tbody')
                ->allowElement('tr')
                ->allowElement('td', ['colspan', 'rowspan', 'data-rte-horizontal-align', 'data-rte-vertical-align', 'data-rte-text-color', 'data-rte-background-color'])
                ->allowElement('th', ['colspan', 'rowspan', 'scope', 'data-rte-horizontal-align', 'data-rte-vertical-align', 'data-rte-text-color', 'data-rte-background-color']);
        }

        return $config
            ->allowElement('a', ['href', 'title', 'target', 'rel'])
            ->allowElement('img', ['src', 'alt', 'title', 'data-rte-align', 'style'])
            ->allowElement('span', ['data-rte-size'])
            ->allowLinkSchemes($settings['links']['schemes'] ?? ['http', 'https'])
            ->allowRelativeLinks((bool) ($settings['links']['allow_relative'] ?? false))
            ->allowMediaSchemes($settings['images']['schemes'] ?? ['http', 'https'])
            ->allowRelativeMedias(false)
            ->forceAttribute('a', 'rel', 'noopener noreferrer');
    }

    /** @param array<string, mixed> $settings */
    private function normalizeRestrictedAttributes(string $html, array $settings): string
    {
        if ($html === '') {
            return '';
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        // DOMDocument otherwise treats HTML fragments without metadata as ISO-8859-1.
        $document->loadHTML('<?xml encoding="UTF-8"><div data-rte-root>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($document);
        $allowedAttributes = [
            'a' => ['href', 'title', 'target', 'rel'],
            'img' => ['src', 'alt', 'title', 'data-rte-align', 'style'],
            'span' => ['data-rte-size'],
            'td' => ['colspan', 'rowspan', 'data-rte-horizontal-align', 'data-rte-vertical-align', 'data-rte-text-color', 'data-rte-background-color'],
            'th' => ['colspan', 'rowspan', 'scope', 'data-rte-horizontal-align', 'data-rte-vertical-align', 'data-rte-text-color', 'data-rte-background-color'],
        ];
        $root = $document->documentElement;
        if (! $root instanceof DOMElement || ! $root->hasAttribute('data-rte-root')) {
            $root = $xpath->query('//*[@data-rte-root]')?->item(0);
        }
        if ($root instanceof DOMElement) {
            $this->removeDisallowedAttributes($root, $allowedAttributes);
        }
        $alignments = array_map('strval', $settings['images']['alignments'] ?? []);
        $sizes = array_keys($settings['font_sizes'] ?? []);
        foreach ($xpath->query('//*[@data-rte-align]') ?: [] as $node) {
            if ($node instanceof DOMElement && ! in_array($node->getAttribute('data-rte-align'), $alignments, true)) {
                $node->removeAttribute('data-rte-align');
            }
        }
        foreach ($xpath->query('//img[not(@alt)]') ?: [] as $node) {
            $node->parentNode?->removeChild($node);
        }
        foreach ($xpath->query('//img[@style]') ?: [] as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $width = $this->imageWidth($node->getAttribute('style'));
            $resize = $settings['images']['resize'] ?? [];
            if (! ($resize['enabled'] ?? true) || $width === null || ! $this->isAllowedImageWidth($width, $resize)) {
                $node->removeAttribute('style');
            } else {
                $node->setAttribute('style', "width: {$width}%;");
            }
        }
        foreach ($xpath->query('//*[@data-rte-size]') ?: [] as $node) {
            if ($node instanceof DOMElement && ! in_array($node->getAttribute('data-rte-size'), $sizes, true)) {
                $node->removeAttribute('data-rte-size');
            }
        }
        if ($settings['tables']['enabled'] ?? false) {
            $this->normalizeTableCells($xpath, $settings);
            $this->normalizeTableStructure($xpath);
        }

        $output = '';
        if ($root !== null) {
            foreach ($root->childNodes as $child) {
                $output .= $document->saveHTML($child);
            }
        }

        return $output;
    }

    /** @param array<string, mixed> $settings */
    private function normalizeTableInput(string $html, array $settings): string
    {
        if (! ($settings['tables']['enabled'] ?? false) || stripos($html, '<table') === false) {
            return $html;
        }

        [$document, $xpath, $root] = $this->htmlFragment($html);
        foreach ($xpath->query('//td|//th') ?: [] as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $styles = $this->styleDeclarations($node->getAttribute('style'));
            $this->setCanonicalEnum($node, 'data-rte-horizontal-align', $node->getAttribute('data-rte-horizontal-align') ?: ($node->getAttribute('align') ?: ($styles['text-align'] ?? '')), $settings['tables']['horizontal_alignments'] ?? []);
            $this->setCanonicalEnum($node, 'data-rte-vertical-align', $node->getAttribute('data-rte-vertical-align') ?: ($node->getAttribute('valign') ?: ($styles['vertical-align'] ?? '')), $settings['tables']['vertical_alignments'] ?? []);
            $this->setCanonicalColor($node, 'data-rte-text-color', $node->getAttribute('data-rte-text-color') ?: ($styles['color'] ?? ''), $settings);
            $this->setCanonicalColor($node, 'data-rte-background-color', $node->getAttribute('data-rte-background-color') ?: ($node->getAttribute('bgcolor') ?: ($styles['background-color'] ?? ($styles['background'] ?? ''))), $settings);
        }
        $this->normalizeTableCells($xpath, $settings);

        return $this->fragmentHtml($document, $root);
    }

    /** @param array<string, mixed> $settings */
    private function normalizeTableCells(DOMXPath $xpath, array $settings): void
    {
        $tables = $settings['tables'] ?? [];
        $maxSpan = max(1, (int) ($tables['max_span'] ?? 100));
        foreach ($xpath->query('//td|//th') ?: [] as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            foreach (['colspan', 'rowspan'] as $attribute) {
                $value = filter_var($node->getAttribute($attribute), FILTER_VALIDATE_INT);
                if ($value === false || $value <= 1 || $value > $maxSpan) {
                    $node->removeAttribute($attribute);
                } else {
                    $node->setAttribute($attribute, (string) $value);
                }
            }
            $this->setCanonicalEnum($node, 'data-rte-horizontal-align', $node->getAttribute('data-rte-horizontal-align'), $tables['horizontal_alignments'] ?? []);
            $this->setCanonicalEnum($node, 'data-rte-vertical-align', $node->getAttribute('data-rte-vertical-align'), $tables['vertical_alignments'] ?? []);
            $this->setCanonicalColor($node, 'data-rte-text-color', $node->getAttribute('data-rte-text-color'), $settings);
            $this->setCanonicalColor($node, 'data-rte-background-color', $node->getAttribute('data-rte-background-color'), $settings);
            if (strtolower($node->tagName) === 'th') {
                $this->setCanonicalEnum($node, 'scope', $node->getAttribute('scope'), $tables['scopes'] ?? []);
            } else {
                $node->removeAttribute('scope');
            }
        }
    }

    private function normalizeTableStructure(DOMXPath $xpath): void
    {
        foreach ($xpath->query('//table') ?: [] as $table) {
            if (! $table instanceof DOMElement) {
                continue;
            }

            $rows = [];
            foreach (iterator_to_array($table->childNodes) as $child) {
                if ($child instanceof DOMElement && strtolower($child->tagName) === 'tr') {
                    $rows[] = $child;
                }
            }
            if ($rows === []) {
                continue;
            }

            $body = $table->ownerDocument->createElement('tbody');
            $table->insertBefore($body, $rows[0]);
            foreach ($rows as $row) {
                $body->appendChild($row);
            }
        }
    }

    /** @param list<mixed> $allowed */
    private function setCanonicalEnum(DOMElement $node, string $attribute, string $value, array $allowed): void
    {
        $value = strtolower(trim($value));
        $allowed = array_map(static fn ($item) => strtolower((string) $item), $allowed);
        if ($value !== '' && in_array($value, $allowed, true)) {
            $node->setAttribute($attribute, $value);
        } else {
            $node->removeAttribute($attribute);
        }
    }

    /** @param array<string, mixed> $settings */
    private function setCanonicalColor(DOMElement $node, string $attribute, string $value, array $settings): void
    {
        $token = $this->colorToken($value, $settings['tables']['palette'] ?? []);
        if ($token === null) {
            $node->removeAttribute($attribute);
        } else {
            $node->setAttribute($attribute, $token);
        }
    }

    /** @param list<mixed> $allowed */
    private function colorToken(string $value, array $allowed): ?string
    {
        $value = strtolower(trim($value));
        $tokens = array_map(static fn ($item) => strtolower((string) $item), $allowed);
        if (in_array($value, $tokens, true)) {
            return $value;
        }

        $hex = $this->normalizeHex($value);
        foreach ($tokens as $token) {
            if ($hex !== null && $hex === $this->normalizeHex((string) ($this->palette[$token] ?? ''))) {
                return $token;
            }
        }

        return null;
    }

    private function normalizeHex(string $value): ?string
    {
        if (preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', trim($value), $matches) !== 1) {
            return null;
        }
        $hex = strtolower($matches[1]);
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }

        return '#'.$hex;
    }

    /** @return array<string, string> */
    private function styleDeclarations(string $style): array
    {
        $declarations = [];
        foreach (explode(';', $style) as $declaration) {
            if (! str_contains($declaration, ':')) {
                continue;
            }
            [$property, $value] = array_map('trim', explode(':', $declaration, 2));
            $declarations[strtolower($property)] = $value;
        }

        return $declarations;
    }

    /** @return array{DOMDocument, DOMXPath, DOMElement} */
    private function htmlFragment(string $html): array
    {
        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8"><div data-rte-fragment>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $xpath = new DOMXPath($document);
        $root = $xpath->query('//*[@data-rte-fragment]')?->item(0);

        return [$document, $xpath, $root instanceof DOMElement ? $root : $document->documentElement];
    }

    private function fragmentHtml(DOMDocument $document, DOMElement $root): string
    {
        $output = '';
        foreach ($root->childNodes as $child) {
            $output .= $document->saveHTML($child);
        }

        return $output;
    }

    private function imageWidth(string $style): ?int
    {
        return preg_match('/^\s*width\s*:\s*(\d+)%\s*;?\s*$/i', $style, $matches) === 1
            ? (int) $matches[1]
            : null;
    }

    /** @param array<string, mixed> $resize */
    private function isAllowedImageWidth(int $width, array $resize): bool
    {
        $min = (int) ($resize['min'] ?? 20);
        $max = (int) ($resize['max'] ?? 100);
        $step = (int) ($resize['step'] ?? 5);

        return $step > 0 && $width >= $min && $width <= $max && ($width - $min) % $step === 0;
    }

    /** @param array<string, list<string>> $allowedAttributes */
    private function removeDisallowedAttributes(DOMElement $root, array $allowedAttributes): void
    {
        foreach (iterator_to_array($root->childNodes) as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $allowed = $allowedAttributes[strtolower($node->tagName)] ?? [];
            foreach (iterator_to_array($node->attributes) as $attribute) {
                if (! in_array(strtolower($attribute->name), $allowed, true)) {
                    $node->removeAttributeNode($attribute);
                }
            }

            $this->removeDisallowedAttributes($node, $allowedAttributes);
        }
    }

    private function isVisuallyEmpty(string $html): bool
    {
        if (preg_match('/<(img|hr|table)\b/i', $html) === 1) {
            return false;
        }
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(str_replace("\xc2\xa0", ' ', $text)) === '';
    }
}
