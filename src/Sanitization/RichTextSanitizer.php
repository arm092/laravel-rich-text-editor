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
    public function __construct(private readonly array $profiles, private readonly string $defaultProfile = 'standard')
    {
    }

    public function sanitize(?string $html, ?string $profile = null): ?string
    {
        if ($html === null) {
            return null;
        }

        $settings = $this->profile($profile);
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

        return $config
            ->allowElement('a', ['href', 'title', 'target', 'rel'])
            ->allowElement('img', ['src', 'alt', 'title', 'data-rte-align'])
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
        $document->loadHTML('<div data-rte-root>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($document);
        $allowedAttributes = [
            'a' => ['href', 'title', 'target', 'rel'],
            'img' => ['src', 'alt', 'title', 'data-rte-align'],
            'span' => ['data-rte-size'],
        ];
        foreach ($xpath->query('//*') ?: [] as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }
            if ($node->hasAttribute('data-rte-root')) {
                continue;
            }

            $allowed = $allowedAttributes[strtolower($node->tagName)] ?? [];
            foreach (iterator_to_array($node->attributes) as $attribute) {
                if (! in_array(strtolower($attribute->name), $allowed, true)) {
                    $node->removeAttributeNode($attribute);
                }
            }
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
        foreach ($xpath->query('//*[@data-rte-size]') ?: [] as $node) {
            if ($node instanceof DOMElement && ! in_array($node->getAttribute('data-rte-size'), $sizes, true)) {
                $node->removeAttribute('data-rte-size');
            }
        }

        $root = $xpath->query('//*[@data-rte-root]')?->item(0);
        $output = '';
        if ($root !== null) {
            foreach ($root->childNodes as $child) {
                $output .= $document->saveHTML($child);
            }
        }

        return $output;
    }

    private function isVisuallyEmpty(string $html): bool
    {
        if (preg_match('/<(img|hr)\b/i', $html) === 1) {
            return false;
        }
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(str_replace("\xc2\xa0", ' ', $text)) === '';
    }
}
