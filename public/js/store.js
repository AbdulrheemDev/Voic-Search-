/**
 * شيفرة صفحات المتجر التجريبي (المنصة المستضيفة).
 * تقرأ بيانات المنتجات والفئات من نقاط JSON التي يوفرها التطبيق، وتبني الواجهة في المتصفح.
 */
(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function formatPrice(value) {
        return new Intl.NumberFormat('ar-YE', {maximumFractionDigits: 0}).format(value || 0);
    }

    function productCard(product) {
        const attributes = (product.attributes || []).map(function (value) {
            return '<span class="chip">' + escapeHtml(value) + '</span>';
        }).join('');
        const availability = product.available
            ? '<span class="availability in-stock">متوفر</span>'
            : '<span class="availability out-of-stock">غير متوفر</span>';
        return '<article class="product-card">' +
            '<a class="product-image" href="' + escapeHtml(product.url) + '">' +
            '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" onerror="this.classList.add(\'is-missing\')">' +
            '<span class="product-initial">' + escapeHtml(product.name.trim().charAt(0)) + '</span></a>' +
            '<div class="product-body">' +
            '<h3 class="product-name"><a href="' + escapeHtml(product.url) + '">' + escapeHtml(product.name) + '</a></h3>' +
            '<p class="product-category">' + escapeHtml(product.category || '') + '</p>' +
            '<p class="product-attributes">' + attributes + '</p>' +
            '<p class="product-price">' + formatPrice(product.price) + ' <small>ريال يمني</small></p>' +
            availability + '</div></article>';
    }

    async function fetchJson(url) {
        const response = await fetch(url, {headers: {'Accept': 'application/json'}});
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    }

    const categoriesBox = document.getElementById('categories');
    const productsBox = document.getElementById('products');
    const detailBox = document.getElementById('product-detail');

    if (categoriesBox && productsBox) {
        fetchJson('/api/categories').then(function (data) {
            categoriesBox.innerHTML = data.categories.map(function (category) {
                return '<a class="category-card" href="/category/' + category.id + '">' +
                    '<span class="category-name">' + escapeHtml(category.name) + '</span>' +
                    '<span class="category-count">' + category.products_count + ' منتجًا</span></a>';
            }).join('');
        }).catch(function () {
            categoriesBox.innerHTML = '<p class="message-box warning">تعذر تحميل الفئات.</p>';
        });

        fetchJson('/api/products?limit=12').then(function (data) {
            productsBox.innerHTML = data.products.map(productCard).join('');
        }).catch(function () {
            productsBox.innerHTML = '<p class="message-box warning">تعذر تحميل المنتجات.</p>';
        });
    }

    if (productsBox && !categoriesBox) {
        const match = window.location.pathname.match(/\/category\/(\d+)/);
        const categoryId = match ? match[1] : null;
        fetchJson('/api/products?limit=48' + (categoryId ? '&category=' + categoryId : ''))
            .then(function (data) {
                productsBox.innerHTML = data.products.map(productCard).join('');
                const title = document.getElementById('category-title');
                if (title && data.products.length) {
                    title.textContent = 'فئة ' + data.products[0].category;
                }
            })
            .catch(function () {
                productsBox.innerHTML = '<p class="message-box warning">تعذر تحميل منتجات الفئة.</p>';
            });
    }

    if (detailBox) {
        const match = window.location.pathname.match(/\/product\/(\d+)/);
        const productId = match ? match[1] : null;
        if (productId) {
            fetchJson('/api/products/' + productId).then(function (data) {
                const product = data.product;
                detailBox.innerHTML =
                    '<div class="product-detail-media"><img src="' + escapeHtml(product.image) + '" alt="' +
                    escapeHtml(product.name) + '" onerror="this.classList.add(\'is-missing\')"><span class="product-initial">' +
                    escapeHtml(product.name.trim().charAt(0)) + '</span></div>' +
                    '<div class="product-detail-body"><h1>' + escapeHtml(product.name) + '</h1>' +
                    '<p class="product-category">' + escapeHtml(product.category || '') + '</p>' +
                    '<p class="product-detail-description">' + escapeHtml(product.description || '') + '</p>' +
                    '<p class="product-attributes">' + (product.attributes || []).map(function (value) {
                        return '<span class="chip">' + escapeHtml(value) + '</span>';
                    }).join('') + '</p>' +
                    '<p class="product-price">' + formatPrice(product.price) + ' <small>ريال يمني</small></p>' +
                    (product.available ? '<span class="availability in-stock">متوفر</span>' : '<span class="availability out-of-stock">غير متوفر</span>') +
                    '<p><a class="hero-action" href="/search">ابحث عن منتجات أخرى بالصوت</a></p></div>';
                document.getElementById('related').innerHTML = (data.related || []).map(productCard).join('');
            }).catch(function () {
                detailBox.innerHTML = '<p class="message-box warning">تعذر تحميل بيانات المنتج.</p>';
            });
        }
    }
})();
