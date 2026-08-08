<?php

namespace Arm092\RichTextEditor\Casts;

use Arm092\RichTextEditor\Sanitization\RichTextSanitizer;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/** @implements CastsAttributes<string|null, string|null> */
class RichTextCast implements CastsAttributes
{
    public function __construct(private readonly ?string $profile = null)
    {
    }

    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : (string) $value;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value !== null && ! is_string($value) && ! $value instanceof \Stringable) {
            throw new InvalidArgumentException("The [{$key}] attribute must be a string, Stringable, or null.");
        }

        return app(RichTextSanitizer::class)->sanitize($value === null ? null : (string) $value, $this->profile);
    }
}
