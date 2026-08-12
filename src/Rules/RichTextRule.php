<?php

namespace Arm092\RichTextEditor\Rules;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Closure;
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
        if ($value !== null && $this->withoutCanonicalLinkRel(trim($value)) !== $this->withoutCanonicalLinkRel((string) $sanitized)) {
            $fail('The :attribute contains unsupported or unsafe HTML.');
            return;
        }

        $limit = $this->maxCharacters ?? $sanitizer->profile($this->profile)['max_characters'] ?? null;
        $length = mb_strlen(trim(html_entity_decode(strip_tags((string) $sanitized), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        if ($limit !== null && $length > $limit) {
            $fail("The :attribute may not contain more than {$limit} characters.");
        }
    }

    private function withoutCanonicalLinkRel(string $html): string
    {
        return preg_replace_callback('/<a\b[^>]*>/i', static function (array $matches): string {
            return preg_replace('/\s+rel\s*=\s*(?:"[^"]*"|\'[^\']*\')/i', '', $matches[0]) ?? $matches[0];
        }, $html) ?? $html;
    }
}
