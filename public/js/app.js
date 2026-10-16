/**
 * Main Application Logic
 * Integrates VoiceSearch, UI state, Product rendering, Pipeline Visualizer, and Cart
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const micBtn = document.getElementById('mic-btn');
  const micStatus = document.getElementById('mic-status');
  const speechStatusBanner = document.getElementById('speech-status-banner');
  const productsGrid = document.getElementById('products-grid');
  const categoryTabs = document.getElementById('category-tabs');
  const resultsHeader = document.getElementById('results-header');
  const resultsCountText = document.getElementById('results-count-text');
  const resetSearchBtn = document.getElementById('reset-search-btn');
  const configSelector = document.getElementById('config-selector');

  // Pipeline Inspector Elements
  const pipelineBox = document.getElementById('pipeline-box');
  const pipeRaw = document.getElementById('pipe-raw');
  const pipeNorm = document.getElementById('pipe-norm');
  const pipeStop = document.getElementById('pipe-stop');
  const pipeLex = document.getElementById('pipe-lex');
  const pipeFinal = document.getElementById('pipe-final');
  const pipeTime = document.getElementById('pipe-time');

  // Cart Elements
  const cartBtn = document.getElementById('cart-btn');
  const cartBadge = document.getElementById('cart-badge');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartClose = document.getElementById('cart-close');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartTotalAmount = document.getElementById('cart-total-amount');

  // State
  let currentProducts = [];
  let currentCategories = [];
  let cart = [];
  let selectedCategory = null;

  // Initialize Voice Search
  const voiceSearch = new VoiceSearch({
    onTranscript: (transcript, asrLatency) => {
      searchInput.value = transcript;
      showStatusBanner(`تم التقاط الصوت: "${transcript}"`, 'info');
      executeSearch(transcript, 'voice', asrLatency);
    },
    onInterim: (interim) => {
      searchInput.value = interim;
      showStatusBanner(`جاري الاستماع: "${interim}"...`, 'listening');
    },
    onError: (msg) => {
      showStatusBanner(msg, 'error');
      micBtn.classList.remove('mic-active');
      micStatus.classList.add('hidden');
    },
    onStateChange: (state) => {
      if (state === 'listening') {
        micBtn.classList.add('mic-active');
        micStatus.classList.remove('hidden');
        showStatusBanner('جاري الاستماع... تحدث الآن بوضوح', 'listening');
      } else if (state === 'processing') {
        micStatus.classList.remove('hidden');
        showStatusBanner('جاري تحليل الصوت ومعالجة الاستعلام...', 'info');
      } else {
        micBtn.classList.remove('mic-active');
        micStatus.classList.add('hidden');
      }
    }
  });

  // Check Web Speech API Support (FR-13, TC-09)
  if (!voiceSearch.isSupported) {
    if (micBtn) {
      micBtn.title = 'التعرف الصوتي غير مدعوم في متصفحك الحالي، تم تفعيل الإدخال النصي ومحاكي الصوت';
      micBtn.classList.add('opacity-40', 'cursor-not-allowed');
    }
  }

  // Event Listeners
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      voiceSearch.start();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim();
      executeSearch(q, 'text');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        executeSearch(q, 'text');
      }
    });
  }

  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      pipelineBox.classList.add('hidden');
      speechStatusBanner.classList.add('hidden');
      loadProducts(selectedCategory);
    });
  }

  // Preset sample buttons
  document.querySelectorAll('.sample-voice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      searchInput.value = q;
      showStatusBanner(`محاكاة استعلام صوتي: "${q}"`, 'info');
      executeSearch(q, 'simulated-voice', 385);
    });
  });

  // Cart Drawer open/close
  if (cartBtn) cartBtn.addEventListener('click', () => cartDrawer.classList.remove('translate-x-full'));
  if (cartClose) cartClose.addEventListener('click', () => cartDrawer.classList.add('translate-x-full'));

  // Load initial data
  loadCategories();
  loadProducts();

  // Helper Functions

  function showStatusBanner(text, type = 'info') {
    if (!speechStatusBanner) return;
    speechStatusBanner.classList.remove('hidden', 'bg-blue-50', 'text-blue-800', 'bg-red-50', 'text-red-800', 'bg-emerald-50', 'text-emerald-800');
    
    if (type === 'error') {
      speechStatusBanner.className = 'p-3 mb-4 rounded-xl bg-red-100 text-red-800 border border-red-200 text-sm font-medium flex items-center gap-2';
      speechStatusBanner.innerHTML = `⚠️ <span>${text}</span>`;
    } else if (type === 'listening') {
      speechStatusBanner.className = 'p-3 mb-4 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 text-sm font-medium flex items-center justify-between';
      speechStatusBanner.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span>${text}</span>
        </div>
        <div class="sound-wave">
          <div class="sound-bar"></div>
          <div class="sound-bar"></div>
          <div class="sound-bar"></div>
          <div class="sound-bar"></div>
          <div class="sound-bar"></div>
        </div>
      `;
    } else {
      speechStatusBanner.className = 'p-3 mb-4 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 text-sm font-medium flex items-center gap-2';
      speechStatusBanner.innerHTML = `🎙️ <span>${text}</span>`;
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        currentCategories = data.categories;
        renderCategoryTabs(currentCategories);
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  }

  function renderCategoryTabs(categories) {
    if (!categoryTabs) return;
    categoryTabs.innerHTML = `
      <button class="cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition ${selectedCategory === null ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-cat="all">
        الكل (${categories.reduce((acc, c) => acc + c.product_count, 0)})
      </button>
    `;

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;
      btn.setAttribute('data-cat', cat.id);
      btn.textContent = `${cat.name} (${cat.product_count})`;
      btn.addEventListener('click', () => {
        selectedCategory = cat.id;
        document.querySelectorAll('.cat-btn').forEach(b => {
          b.className = 'cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200';
        });
        btn.className = 'cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition bg-blue-600 text-white shadow-sm';
        loadProducts(cat.id);
      });
      categoryTabs.appendChild(btn);
    });

    const allBtn = categoryTabs.querySelector('[data-cat="all"]');
    allBtn.addEventListener('click', () => {
      selectedCategory = null;
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.className = 'cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200';
      });
      allBtn.className = 'cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition bg-blue-600 text-white shadow-sm';
      loadProducts(null);
    });
  }

  async function loadProducts(categoryId = null) {
    try {
      let url = '/api/products';
      if (categoryId) url += `?category_id=${categoryId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        currentProducts = data.products;
        renderProducts(currentProducts, false);
        if (resultsHeader) resultsHeader.classList.add('hidden');
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  }

  async function executeSearch(query, mode = 'voice', asrLatency = 0) {
    if (!query) {
      showStatusBanner('يرجى إدخال أو نطق عبارة بحث.', 'error');
      return;
    }

    const config = configSelector ? configSelector.value : 'C';

    try {
      const clientReqStart = performance.now();
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode, config })
      });

      const data = await res.json();
      const clientReqEnd = performance.now();
      const networkRoundTrip = +(clientReqEnd - clientReqStart).toFixed(2);

      // Render search results
      renderProducts(data.results || [], true);

      // Update results header
      if (resultsHeader && resultsCountText) {
        resultsHeader.classList.remove('hidden');
        resultsCountText.textContent = data.message;
      }

      // Update Pipeline Trace Inspector
      if (data.trace && pipelineBox) {
        pipelineBox.classList.remove('hidden');
        pipeRaw.textContent = data.trace.step1_raw || '-';
        pipeNorm.textContent = data.trace.step2_normalized || '-';
        pipeStop.textContent = data.trace.step3_stopwords_removed || '-';
        pipeLex.textContent = data.trace.step4_lexicon_applied || '-';
        pipeFinal.textContent = data.trace.step5_search_query || '-';

        const serverTime = data.trace.execution_time_ms || 0;
        const totalTime = +(asrLatency + serverTime).toFixed(2);

        pipeTime.innerHTML = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            زمن التعرف (ASR): ${asrLatency > 0 ? asrLatency + ' مللي ثانية' : 'نصي'}
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            معالجة الخادم: ${serverTime} مللي ثانية
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            الزمن الكلي: ${totalTime} مللي ثانية
          </span>
        `;
      }
    } catch (e) {
      console.error('Search request failed:', e);
      showStatusBanner('حدث خطأ أثناء الاتصال بالخادم.', 'error');
    }
  }

  function renderProducts(products, isSearchResult = false) {
    if (!productsGrid) return;
    productsGrid.innerHTML = '';

    if (!products || products.length === 0) {
      productsGrid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="text-6xl mb-4">🔍</div>
          <h3 class="text-xl font-bold text-slate-800 mb-2">لا توجد منتجات مطابقة</h3>
          <p class="text-slate-500 max-w-md mx-auto mb-6">لم يتم العثور على أي منتج يطابق عبارة البحث الحالية في المتجر. جرب استعلاماً آخر أو تصفح الأقسام.</p>
          <button id="clear-search-view" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            عرض كافة المنتجات
          </button>
        </div>
      `;
      const btn = document.getElementById('clear-search-view');
      if (btn) btn.addEventListener('click', () => loadProducts());
      return;
    }

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col';

      const relevanceBadge = (isSearchResult && p._score) ? `
        <div class="absolute top-3 left-3 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
          صلة: ${p._score}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="relative h-48 bg-slate-50 flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
          <img src="${p.image_url}" alt="${p.name}" class="max-h-full object-contain">
          ${relevanceBadge}
          <span class="absolute top-3 right-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm font-medium">
            ${p.category_name || p.category || 'متجر'}
          </span>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-slate-800 text-base mb-2 leading-snug">${p.name}</h3>
            <p class="text-xs text-slate-500 line-clamp-2 mb-4">${p.description || ''}</p>
          </div>
          <div>
            <div class="flex items-baseline justify-between mb-4">
              <div>
                <span class="text-xl font-extrabold text-blue-600">${p.price} $</span>
                ${p.original_price ? `<span class="text-xs text-slate-400 line-through mr-2">${p.original_price} $</span>` : ''}
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${p.in_stock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                ${p.in_stock ? '✓ متوفر' : 'نفذت الكمية'}
              </span>
            </div>
            <div class="flex gap-2">
              <button class="add-to-cart-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-xl text-sm transition flex items-center justify-center gap-1.5" data-id="${p.id}">
                🛒 أضف للسلة
              </button>
              <button class="view-details-btn p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition" data-id="${p.id}" title="عرض التفاصيل">
                👁️
              </button>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(p));
      card.querySelector('.view-details-btn').addEventListener('click', () => showProductDetails(p.id));

      productsGrid.appendChild(card);
    });
  }

  function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    showToast(`تمت إضافة "${product.name}" إلى السلة`);
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartBadge) {
      cartBadge.textContent = totalCount;
      cartBadge.classList.toggle('hidden', totalCount === 0);
    }

    if (cartTotalAmount) {
      cartTotalAmount.textContent = totalPrice.toFixed(2) + ' $';
    }

    if (cartItemsList) {
      if (cart.length === 0) {
        cartItemsList.innerHTML = '<p class="text-center text-slate-400 py-12">السلة فارغة حالياً</p>';
      } else {
        cartItemsList.innerHTML = cart.map(item => `
          <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <img src="${item.image_url}" class="w-12 h-12 object-contain bg-white rounded-lg p-1 border border-slate-200">
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-bold text-slate-800 truncate">${item.name}</h4>
              <p class="text-xs text-blue-600 font-semibold">${item.price} $ × ${item.quantity}</p>
            </div>
            <button class="remove-cart-item text-red-500 hover:text-red-700 text-sm p-1" data-id="${item.id}">🗑️</button>
          </div>
        `).join('');

        cartItemsList.querySelectorAll('.remove-cart-item').forEach(b => {
          b.addEventListener('click', () => {
            const id = parseInt(b.getAttribute('data-id'), 10);
            cart = cart.filter(i => i.id !== id);
            updateCartUI();
          });
        });
      }
    }
  }

  async function showProductDetails(id) {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (!data.success) return;

      const p = data.product;
      const modal = document.getElementById('product-modal');
      const content = document.getElementById('modal-content');
      if (!modal || !content) return;

      const attrsHtml = (p.attributes || []).map(a => `
        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span class="text-xs text-slate-500 block">${a.name}</span>
          <span class="text-sm font-bold text-slate-800">${a.value}</span>
        </div>
      `).join('');

      content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div class="h-64 bg-slate-50 rounded-2xl flex items-center justify-center p-4 border border-slate-100">
            <img src="${p.image_url}" class="max-h-full object-contain">
          </div>
          <div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full mb-2 inline-block">
              ${p.category_name}
            </span>
            <h2 class="text-xl font-bold text-slate-900 mb-3">${p.name}</h2>
            <p class="text-sm text-slate-600 mb-4 leading-relaxed">${p.description}</p>
            <div class="text-2xl font-extrabold text-blue-600 mb-4">${p.price} $</div>
            
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">المواصفات والخصائص:</h4>
            <div class="grid grid-cols-2 gap-2 mb-6">
              ${attrsHtml || '<p class="text-xs text-slate-400">لا توجد خصائص إضافية</p>'}
            </div>

            <button id="modal-add-cart" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2">
              🛒 إضافة إلى السلة
            </button>
          </div>
        </div>
      `;

      document.getElementById('modal-add-cart').addEventListener('click', () => {
        addToCart(p);
        modal.classList.add('hidden');
      });

      modal.classList.remove('hidden');
    } catch (e) {
      console.error('Failed to get product details:', e);
    }
  }

  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document.getElementById('product-modal').classList.add('hidden');
    });
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 left-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 animate-bounce';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
});
