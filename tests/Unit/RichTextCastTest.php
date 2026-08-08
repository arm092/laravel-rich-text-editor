<?php

namespace Arm092\RichTextEditor\Tests\Unit;

use Arm092\RichTextEditor\Casts\RichTextCast;
use Arm092\RichTextEditor\Tests\TestCase;
use Illuminate\Database\Eloquent\Model;

class RichTextCastTest extends TestCase
{
    public function test_it_sanitizes_values_on_the_way_into_the_model(): void
    {
        $model = new class extends Model {
            protected $guarded = [];

            protected function casts(): array
            {
                return ['content' => RichTextCast::class.':standard'];
            }
        };

        $model->content = '<p onclick="bad()">Hello <strong>world</strong></p>';

        $this->assertSame('<p>Hello <strong>world</strong></p>', $model->getAttributes()['content']);
        $this->assertSame('<p>Hello <strong>world</strong></p>', $model->content);
    }

    public function test_it_preserves_null(): void
    {
        $model = new class extends Model {
            protected $guarded = [];
            protected function casts(): array { return ['content' => RichTextCast::class]; }
        };

        $model->content = null;

        $this->assertNull($model->getAttributes()['content']);
    }
}
