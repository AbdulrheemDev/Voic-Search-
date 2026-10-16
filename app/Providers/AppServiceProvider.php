<?php

namespace App\Providers;

use App\Search\Lexicon;
use App\Search\Normalizer;
use App\Search\StopPhraseFilter;
use Illuminate\Support\ServiceProvider;
use Meilisearch\Client;

class AppServiceProvider extends ServiceProvider
{
    /**
     * تسجيل خدمات المحرك: التطبيع، وعبارات الطلب، والقاموس التجاري، وعميل Meilisearch.
     */
    public function register(): void
    {
        $this->app->singleton(Normalizer::class);

        $this->app->singleton(StopPhraseFilter::class, fn ($app) => new StopPhraseFilter(
            $app->make(Normalizer::class)
        ));

        $this->app->singleton(Lexicon::class, fn ($app) => new Lexicon(
            $app->make(Normalizer::class)
        ));

        $this->app->singleton(Client::class, fn () => new Client(
            config('scout.meilisearch.host'),
            config('scout.meilisearch.key')
        ));
    }

    public function boot(): void
    {
        //
    }
}
