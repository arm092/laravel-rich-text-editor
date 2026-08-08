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
        if ($value !== null && trim($value) !== $sanitized) {
            $fail('The :attribute contains unsupported or unsafe HTML.');
            return;
        }

        $limit = $this->maxCharacters ?? $sanitizer->profile($this->profile)['max_characters'] ?? null;
        $length = mb_strlen(trim(html_entity_decode(strip_tags((string) $sanitized), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        if ($limit !== null && $length > $limit) {
            $fail("The :attribute may not contain more than {$limit} characters.");
        }
    }
}
