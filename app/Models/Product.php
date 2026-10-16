<?php

namespace App\Models;

use App\Search\Normalizer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

/**
 * نموذج المنتج في المتجر المستضيف.
 *
 * نقطة التكامل الثالثة (القسم 2.5.3 من الفصل الثالث): يُضاف إلى نموذج المنتج القابلية
 * للبحث التي توفرها Laravel Scout، وتُعرَّف الدالة toSearchableArray التي تحدد الحقول
 * المفهرسة: الاسم والفئة وقيم الخصائص والوصف، بعد تطبيق قواعد التطبيع نفسها التي
 * تُطبق على الاستعالم (الجدولان 1.3 و2.3). أما السعر والصورة وحالة التوفر فلا تُفهرس،
 * لأنها لا تُستخدم في المطابقة، وتُسترجع من MySQL عند عرض النتائج.
 */
class Product extends Model
{
    use Searchable;

    protected $table = 'products';

    public $timestamps = false;

    protected $fillable = ['name', 'category_id', 'description', 'price', 'image', 'stock'];

    protected $casts = [
        'price' => 'float',
        'stock' => 'integer',
    ];

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<AttributeValue, $this> */
    public function attributeValues(): HasMany
    {
        return $this->hasMany(AttributeValue::class);
    }

    public function isAvailable(): bool
    {
        return $this->stock > 0;
    }

    public function url(): string
    {
        return route('products.show', $this);
    }

    /**
     * وثيقة الفهرسة في Meilisearch (الجدول 2.3).
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        $normalizer = app(Normalizer::class);
        $values = $this->relationLoaded('attributeValues')
            ? $this->attributeValues
            : $this->attributeValues()->orderBy('id')->get();

        return [
            'id' => (int) $this->id,
            'name' => $normalizer->normalize($this->name),
            'category' => $normalizer->normalize($this->category?->name ?? ''),
            'attributes' => $normalizer->normalize($values->pluck('value')->implode('، ')),
            'description' => $normalizer->normalize($this->description),
        ];
    }

    /**
     * معرّف الوثيقة في الفهرس (يستخدمه Scout لمزامنة الفهرس مع سجلات قاعدة البيانات).
     */
    public function getScoutKey(): mixed
    {
        return $this->id;
    }

    public function getScoutKeyName(): string
    {
        return 'id';
    }

    /**
     * تسمية حقول الفهرس كما تُرسل إلى Meilisearch.
     */
    public function searchableAs(): string
    {
        return 'products';
    }
}
