<?php

namespace Arm092\RichTextEditor\Rules;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Closure;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;
use Illuminate\Contracts\Validation\ValidationRule;

class RichTextRule implements ValidationRule
{
    public function __construct(private readonly ?string $profile = null, private readonly ?int $maxCharacters = null)
    {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== null && ! is_string($value)) {
            $fail('The :attribute must contain HTML text.');
            return;
        }

        $sanitizer = app(RichTextSanitizer::class);
        $sanitized = $sanitizer->sanitize($value, $this->profile);
        if ($value !== null && $this->canonicalStructure(trim($value)) !== $this->canonicalStructure((string) $sanitized)) {
            $fail('The :attribute contains unsupported or unsafe HTML.');
            return;
        }

        $limit = $this->maxCharacters ?? $sanitizer->profile($this->profile)['max_characters'] ?? null;
        $length = mb_strlen(trim(html_entity_decode(strip_tags((string) $sanitized), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        if ($limit !== null && $length > $limit) {
            $fail("The :attribute may not contain more than {$limit} characters.");
        }
    }

    private function canonicalStructure(string $html): string
    {
        $html = str_replace(["\r\n", "\r"], "\n", $html);

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->loadHTML(
            '<?xml encoding="UTF-8"><div data-rte-validation-root="1">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return $html;
        }

        $root = (new DOMXPath($document))->query('//*[@data-rte-validation-root="1"]')->item(0);
        if (! $root instanceof DOMElement) {
            return $html;
        }

        return json_encode($this->nodeStructure($root), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: $html;
    }

    private function nodeStructure(DOMNode $node): array
    {
        $attributes = [];
        if ($node instanceof DOMElement) {
            foreach ($node->attributes as $attribute) {
                $name = strtolower($attribute->name);
                if ($node->tagName === 'a' && $name === 'rel') {
                    continue;
                }

                $attributes[$name] = $attribute->value;
            }
            ksort($attributes);
        }

        $children = [];
        foreach ($node->childNodes as $child) {
            $children[] = $this->nodeStructure($child);
        }

        return [$node->nodeType, strtolower($node->nodeName), $node->nodeValue, $attributes, $children];
    }
}
