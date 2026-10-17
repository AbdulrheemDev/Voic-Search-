<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * فئة المنتجات في المتجر المستضيف (علاقة متعدد إلى واحد مع المنتجات، الشكل 5.3).
 */
class Category extends Model
{
    protected $table = 'categories';

    public $timestamps = false;

    protected $fillable = ['name'];

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
