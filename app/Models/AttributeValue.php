<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * قيمة خاصية لمنتج (الجدول الذي يربط المنتجات بالخصائص بعلاقة متعدد إلى متعدد، الشكل 5.3).
 */
class AttributeValue extends Model
{
    protected $table = 'attribute_values';

    public $timestamps = false;

    protected $fillable = ['product_id', 'attribute_id', 'value'];

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Attribute, $this> */
    public function attribute(): BelongsTo
    {
        return $this->belongsTo(Attribute::class);
    }
}
