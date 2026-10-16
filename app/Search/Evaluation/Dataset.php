<?php

namespace App\Search\Evaluation;

use Illuminate\Support\Facades\File;

/**
 * قراءة مجموعات بيانات التجارب: الاستعالمات الاختبارية، وأحكام الصلة، والمتحدثين،
 * وقائمة التسجيلات المطلوبة (القسم 3.3.3 من الفصل الثالث).
 */
class Dataset
{
    public function __construct(private readonly string $dataPath = '')
    {
    }

    private function path(string $file): string
    {
        $base = $this->dataPath !== '' ? $this->dataPath : resource_path('data');

        return $base . DIRECTORY_SEPARATOR . $file;
    }

    /**
     * @return array<int, array<string, string>>
     */
    public function csv(string $file): array
    {
        $path = $this->path($file);
        if (! File::exists($path)) {
            return [];
        }

        $handle = fopen($path, 'r');
        $header = fgetcsv($handle) ?: [];
        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) !== count($header)) {
                continue;
            }
            $rows[] = array_combine($header, $line);
        }
        fclose($handle);

        return $rows;
    }

    /** @return array<int, array<string, string>> الاستعالمات الاختبارية المئة */
    public function queries(): array
    {
        return $this->csv('test_queries.csv');
    }

    /** @return array<int, array{id: int, category: string, text: string, reference: string, mode: string}> */
    public function queriesForEvaluation(): array
    {
        return array_map(fn (array $row): array => [
            'id' => (int) $row['id'],
            'category' => $row['category'],
            'text' => $row['query_text'],
            'reference' => $row['reference_text'],
            'mode' => $row['entry_mode'],
        ], $this->queries());
    }

    /** @return array<int, array<int, int>> معرّف الاستعالم => معرّفات المنتجات ذات الصلة */
    public function relevance(): array
    {
        $path = $this->path('relevance_judgements.json');
        if (! File::exists($path)) {
            return [];
        }

        $decoded = json_decode(File::get($path), true) ?: [];

        return array_map(static fn (array $ids): array => array_map('intval', $ids), $decoded);
    }

    /** @return array<int, array<string, string>> */
    public function manifest(): array
    {
        return $this->csv('recordings_manifest.csv');
    }

    /** @return array<int, array<string, string>> */
    public function speakers(): array
    {
        return $this->csv('speakers.csv');
    }

    /**
     * نصوص التعرف على الكلام إن وُجدت نتائج تسجيل سابقة (لتشغيل الإعدادات على الاستخدام الفعلي).
     *
     * @return array<int, string> معرّف الاستعالم => النص المتعرَّف عليه
     */
    public function recognizedTexts(): array
    {
        $path = storage_path('app/experiments/recordings_results.csv');
        if (! File::exists($path)) {
            return [];
        }

        $handle = fopen($path, 'r');
        $header = fgetcsv($handle) ?: [];
        $map = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) !== count($header)) {
                continue;
            }
            $row = array_combine($header, $line);
            $queryId = (int) ($row['query_id'] ?? 0);
            if ($queryId > 0 && ! isset($map[$queryId])) {
                $map[$queryId] = (string) ($row['recognized_text'] ?? '');
            }
        }
        fclose($handle);

        return $map;
    }
}
