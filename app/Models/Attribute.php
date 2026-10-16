<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * خاصية من خصائص المنتج (اللون، المقاس) — من جداول المتجر المستضيف، لا يعدل المحرك بنيتها.
 */
class Attribute extends Model
{
    protected $table = 'attributes';

    public $timestamps = false;

    protected $fillable = ['name'];

    /** @return HasMany<AttributeValue, $this> */
    public function values(): HasMany
    {
        return $this->hasMany(AttributeValue::class);
    }
}
