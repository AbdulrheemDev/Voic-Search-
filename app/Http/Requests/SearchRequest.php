<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * التحقق من مدخلات نقطة تكامل البحث:
 * query نص الاستعالم (مطلوب)، setting إعداد التجربة (أ/ب/ج، اختياري).
 */
class SearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'query' => ['nullable', 'string', 'max:300'],
            'setting' => ['nullable', 'in:a,b,c'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'query.string' => 'نص الاستعالم يجب أن يكون نصًا.',
            'query.max' => 'نص الاستعالم أطول من الحد المسموح.',
            'setting.in' => 'إعداد التجربة غير معروف.',
        ];
    }
}
