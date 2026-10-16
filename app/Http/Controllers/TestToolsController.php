<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\View\View;

/**
 * أدوات إجراء التجارب (القسمان 3.3.3 و11.3 من الفصل الثالث):
 * توزيع الاستعالمات الاختبارية على المتحدثين، وحفظ نتائج التسجيل (النص المتعرَّف عليه
 * وزمن التعرف على الكلام) لتُحسب بها نسبة خطأ الكلمات في التجربة الأولى.
 *
 * ولا تُحفظ تسجيلات صوت المستخدم في قاعدة البيانات (المتطلب NFR-06)، وإنما يُحفظ
 * النص الناتج عن التعرف وزمنه فقط في ملف تجارب على الخادم.
 */
class TestToolsController extends Controller
{
    private const RESULTS_FILE = 'experiments/recordings_results.csv';

    private const HEADER = ['recording_id', 'query_id', 'speaker_id', 'category', 'reference_text',
        'recognized_text', 'recognition_ms', 'confidence'];

    public function recordings(): View
    {
        return view('tools.recordings');
    }

    /** قائمة الاستعالمات الاختبارية والمتحدثين وقائمة التسجيلات المطلوبة */
    public function testQueries(): JsonResponse
    {
        return response()->json([
            'queries' => $this->csv(resource_path('data/test_queries.csv')),
            'speakers' => $this->csv(resource_path('data/speakers.csv')),
            'manifest' => $this->csv(resource_path('data/recordings_manifest.csv')),
            'existing' => $this->existingResults(),
        ]);
    }

    /** حفظ نتيجة تسجيل واحد (النص المتعرَّف عليه وزمن التعرف) */
    public function storeRecordings(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.recording_id' => ['required', 'string', 'max:20'],
            'records.*.query_id' => ['required'],
            'records.*.speaker_id' => ['required', 'string', 'max:10'],
            'records.*.recognized_text' => ['nullable', 'string', 'max:500'],
            'records.*.recognition_ms' => ['nullable', 'numeric'],
        ]);

        $path = storage_path('app/' . self::RESULTS_FILE);
        File::ensureDirectoryExists(dirname($path));
        if (! File::exists($path)) {
            File::put($path, implode(',', self::HEADER) . PHP_EOL);
        }

        $existing = collect($this->existingResults())->keyBy('recording_id');
        $rows = [];
        foreach ($payload['records'] as $record) {
            $existing[$record['recording_id']] = [
                'recording_id' => $record['recording_id'],
                'query_id' => (string) $record['query_id'],
                'speaker_id' => $record['speaker_id'],
                'category' => (string) ($record['category'] ?? ''),
                'reference_text' => (string) ($record['reference_text'] ?? ''),
                'recognized_text' => (string) ($record['recognized_text'] ?? ''),
                'recognition_ms' => (string) round((float) ($record['recognition_ms'] ?? 0)),
                'confidence' => (string) ($record['confidence'] ?? ''),
            ];
        }

        $handle = fopen($path, 'w');
        fputcsv($handle, self::HEADER);
        foreach ($existing->values() as $row) {
            fputcsv($handle, array_map(static fn ($v): string => (string) $v, $row));
        }
        fclose($handle);

        return response()->json(['saved' => $existing->count(), 'file' => 'storage/app/' . self::RESULTS_FILE]);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function existingResults(): array
    {
        $path = storage_path('app/' . self::RESULTS_FILE);
        if (! File::exists($path)) {
            return [];
        }

        return $this->csv($path);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function csv(string $path): array
    {
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
}
