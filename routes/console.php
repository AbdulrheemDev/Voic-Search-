<?php

use Illuminate\Support\Facades\Schedule;

// لا توجد مهام مجدولة في المحرك؛ تُنفذ مزامنة الفهرس عند تغير بيانات المنتجات (المتطلب FR-08).
Schedule::command('scout:sync-index-settings')->daily();
