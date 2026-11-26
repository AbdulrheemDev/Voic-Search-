<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Traits;

use Laravel\Scout\Searchable;
use Ust\ArabicVoiceSearch\Processing\ArabicNormalizer;

/**
 * سمة الفهرسة القابلة للدمج في نموذج المنتج بالمتجر المستضيف (نقطة التكامل 3 — القسم 2.5.3).
 *
 * تُضاف إلى نموذج Product في متجر التطوير أو في Bagisto 2.4 دون أي تعديل على جداول قاعدة البيانات (NFR-02).
 * تطبع الحقول الخمسة المعتمدة في الجدول (1.3): id, name, category, attributes, description.
 *
 * المتطلبات المرتبطة: FR-07, FR-08, FR-10, FR-11, NFR-02, IR-02, IR-03
 */
trait HasArabicVoiceSearch
{
    use Searchable;

    /**
     * بناء وثيقة الفهرسة المطبّعة لـ Meilisearch عبر Laravel Scout (الجدول 1.3).
     *
     * @return array{id: int|string, name: string, category: string, attributes: string, description: string}
     */
    public function toSearchableArray(): array
    {
        $normalizer = app(ArabicNormalizer::class);

        return [
            'id' => $this->getKey(),
            'name' => $normalizer->normalize($this->voiceSearchName()),
            'category' => $normalizer->normalize($this->voiceSearchCategory()),
            'attributes' => $normalizer->normalize($this->voiceSearchAttributes()),
            'description' => $normalizer->normalize($this->voiceSearchDescription()),
        ];
    }

    /**
     * تحويل سجل المنتج الحي من MySQL إلى بنية JSON المعتمدة للعرض (القسم 5.6.3 — FR-11).
     *
     * @return array{id: int|string, name: string, price: float|int|string|null, image_url: string|null, in_stock: bool, url: string}
     */
    public function toVoiceSearchResult(): array
    {
        return [
            'id' => $this->getKey(),
            'name' => $this->voiceSearchName(),
            'price' => $this->price ?? null,
            'image_url' => $this->image_url ?? $this->image ?? null,
            'in_stock' => (bool) ($this->in_stock ?? (($this->stock ?? 1) > 0)),
            'url' => method_exists($this, 'getUrlAttribute') || isset($this->url)
                ? (string) $this->url
                : '/products/' . $this->getKey(),
        ];
    }

    /**
     * اسم المنتج — قابل لإعادة التعريف في متاجر مثل Bagisto 2.4.
     */
    protected function voiceSearchName(): string
    {
        return (string) ($this->name ?? '');
    }

    /**
     * اسم الفئة — قابل لإعادة التعريف حسب علاقة الفئات في المتجر المستضيف.
     */
    protected function voiceSearchCategory(): string
    {
        if (isset($this->category) && is_object($this->category)) {
            return (string) ($this->category->name ?? '');
        }

        return (string) ($this->category_name ?? '');
    }

    /**
     * قيم الخصائص مجمّعة نصيًا (القرار D-05: الخصائص تُفهرس نصًا ولا تُستخرج كمرشحات منظمة).
     */
    protected function voiceSearchAttributes(): string
    {
        if (isset($this->attributeValues) && is_iterable($this->attributeValues)) {
            $values = [];
            foreach ($this->attributeValues as $item) {
                if (is_object($item) && isset($item->value)) {
                    $values[] = (string) $item->value;
                }
            }
            return implode(' ', $values);
        }

        return (string) ($this->attributes_text ?? '');
    }

    /**
     * وصف المنتج.
     */
    protected function voiceSearchDescription(): string
    {
        return (string) ($this->description ?? '');
    }
}
