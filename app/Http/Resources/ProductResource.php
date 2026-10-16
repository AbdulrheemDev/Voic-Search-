<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * صيغة نتيجة البحث الواحدة التي تعيدها نقطة التكامل إلى الواجهة (القسم 5.6.3):
 * المعرّف، والاسم، والصورة، والسعر، وحالة التوفر، ورابط صفحة المنتج في المتجر، وقيم الخصائص.
 */
class ProductResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'category' => $this->category?->name,
            'attributes' => $this->attributeValues->pluck('value')->values()->all(),
            'price' => (float) $this->price,
            'image' => asset($this->image),
            'available' => $this->isAvailable(),
            'url' => $this->url(),
        ];
    }
}
