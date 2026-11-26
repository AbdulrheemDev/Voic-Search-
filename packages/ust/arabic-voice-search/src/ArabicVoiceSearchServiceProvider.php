<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch;

use Illuminate\Support\ServiceProvider;

/**
 * مزوّد الخدمة الرئيسي لحزمة محرك البحث الصوتي العربي (ust/arabic-voice-search).
 *
 * يتولى هذا المزوّد تسجيل نقاط التكامل الأربع المعتمدة في التصميم (القسم 2.5.3):
 *  1. مكوّن الواجهة (Blade + JS) — عبر loadViewsFrom ونشر الأصول.
 *  2. مسار API للبحث — عبر loadRoutesFrom وفق الإعدادات القابلة للتعديل.
 *  3. ملف الترحيل لجدول القاموس التجاري (lexicon_entries) — الإضافة الوحيدة لقاعدة البيانات (NFR-02).
 *  4. دمج الإعدادات القابلة للتخصيص لكل متجر مستضيف (مثل متجر التطوير أو Bagisto 2.4).
 *
 * @see \Ust\ArabicVoiceSearch\ArabicVoiceSearchServiceProvider
 */
class ArabicVoiceSearchServiceProvider extends ServiceProvider
{
    /**
     * تسجيل خدمات الحزمة ودمج ملف الإعدادات الافتراضي.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/arabic-voice-search.php',
            'arabic-voice-search'
        );

        $this->app->singleton(Processing\ArabicNormalizer::class);
        $this->app->singleton(Processing\StopPhraseFilter::class, function ($app): Processing\StopPhraseFilter {
            $customPhrases = config('arabic-voice-search.stop_phrases');
            return new Processing\StopPhraseFilter(
                $app->make(Processing\ArabicNormalizer::class),
                is_array($customPhrases) ? $customPhrases : null
            );
        });
        $this->app->singleton(Processing\CommercialLexicon::class, function ($app): Processing\CommercialLexicon {
            return new Processing\CommercialLexicon(
                $app->make(Processing\ArabicNormalizer::class)
            );
        });
        $this->app->singleton(Processing\QueryProcessor::class);
        $this->app->singleton(Indexing\MeilisearchSettingsBuilder::class);
        $this->app->singleton(Search\VoiceSearchService::class);
    }

    /**
     * تهيئة موارد الحزمة (المسارات، الواجهات، الترحيلات، الأوامر، وملفات النشر).
     */
    public function boot(): void
    {
        $this->registerRoutes();
        $this->registerViews();
        $this->registerMigrations();
        $this->registerCommands();
        $this->registerPublishing();
    }

    /**
     * تسجيل أوامر Artisan الخاصة بالحزمة.
     */
    protected function registerCommands(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                Console\SyncMeilisearchSettingsCommand::class,
                Console\VerifySchemaIntegrityCommand::class,
            ]);
        }
    }

    /**
     * تحميل مسار API إذا كان مفعّلًا في الإعدادات.
     */
    protected function registerRoutes(): void
    {
        $routesFile = __DIR__ . '/../routes/api.php';

        if (config('arabic-voice-search.route.enabled', true) && file_exists($routesFile)) {
            $this->loadRoutesFrom($routesFile);
        }
    }

    /**
     * تحميل واجهات ومكوّنات Blade الخاصة بزر الميكروفون وشريط البحث.
     */
    protected function registerViews(): void
    {
        $viewsPath = __DIR__ . '/../resources/views';

        if (is_dir($viewsPath)) {
            $this->loadViewsFrom($viewsPath, 'arabic-voice-search');
        }
    }

    /**
     * تحميل ترحيلات الحزمة (جدول lexicon_entries فقط وفق NFR-02).
     */
    protected function registerMigrations(): void
    {
        $migrationsPath = __DIR__ . '/../database/migrations';

        if (is_dir($migrationsPath)) {
            $this->loadMigrationsFrom($migrationsPath);
        }
    }

    /**
     * تعريف المجموعات القابلة للنشر عبر artisan vendor:publish.
     */
    protected function registerPublishing(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            __DIR__ . '/../config/arabic-voice-search.php' => config_path('arabic-voice-search.php'),
        ], 'arabic-voice-search-config');

        $this->publishes([
            __DIR__ . '/../resources/views' => resource_path('views/vendor/arabic-voice-search'),
        ], 'arabic-voice-search-views');

        $this->publishes([
            __DIR__ . '/../resources/js' => public_path('vendor/arabic-voice-search/js'),
        ], 'arabic-voice-search-assets');
    }
}
