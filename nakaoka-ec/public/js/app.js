/**
 * Main App — Product Catalog & Cart Drawer (with Auth-gated pricing)
 * 商品は先に描画し、未ログインでは価格のみ非表示にする。
 */
document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('product-grid');
    const loadingEl = document.getElementById('loading');
    const emptyEl = document.getElementById('empty-state');
    const filterBar = document.querySelector('.filter-inner') || document.querySelector('.category-nav-inner');
    const searchInput = document.getElementById('header-search-input');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total-price');
    const PRODUCT_CACHE_KEY = 'nakaoka-products-cache-v2';
    const CACHE_TTL_MS = 15 * 60 * 1000;
    const INITIAL_RENDER_COUNT = 24;

    let allProducts = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let currentUser = null;
    let productsLoaded = false;   // 商品が読み込まれたか
    let renderLimit = INITIAL_RENDER_COUNT;

    // ── Auth state が確定したら呼ばれる ──
    Auth.onAuthChange(user => {
        currentUser = user;
        Auth.updateHeaderUI(user);
        // 商品が既に読み込まれていれば再レンダリング
        if (productsLoaded) {
            renderProducts(getFilteredProducts());
        }
    });

    function getFilteredProducts() {
        const normalizedQuery = searchQuery.toLowerCase();
        return allProducts.filter(p => {
            const categoryMatched = activeCategory === 'all' || p.category === activeCategory;
            if (!categoryMatched) return false;
            if (!normalizedQuery) return true;

            const name = (p.name || '').toLowerCase();
            const category = (p.category || '').toLowerCase();
            const jan = (p.jan || '').toLowerCase();
            return name.includes(normalizedQuery) || category.includes(normalizedQuery) || jan.includes(normalizedQuery);
        });
    }

    function loadCachedProducts() {
        try {
            const cached = localStorage.getItem(PRODUCT_CACHE_KEY);
            if (!cached) return false;

            const parsed = JSON.parse(cached);
            if (!Array.isArray(parsed.products) || parsed.products.length === 0) return false;
            if (Date.now() - (parsed.cachedAt || 0) > CACHE_TTL_MS) return false;

            allProducts = parsed.products;
            buildCategoryFilters(parsed.categories || []);
            productsLoaded = true;
            renderProducts(getFilteredProducts());
            loadingEl.style.display = 'none';
            return true;
        } catch (err) {
            console.warn('商品キャッシュ読み込みエラー:', err);
            localStorage.removeItem(PRODUCT_CACHE_KEY);
            return false;
        }
    }

    function saveProductsToCache(products, categories) {
        try {
            localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({
                products,
                categories,
                cachedAt: Date.now()
            }));
        } catch (err) {
            console.warn('商品キャッシュ保存エラー:', err);
        }
    }

    function buildCategoryFilters(categories) {
        if (!filterBar) return;
        filterBar.querySelectorAll('.filter-chip:not([data-category="all"])').forEach(chip => chip.remove());

        categories.forEach(cat => {
            const chip = document.createElement('button');
            chip.className = 'filter-chip';
            chip.dataset.category = cat;
            chip.textContent = cat;
            if (cat === activeCategory) chip.classList.add('active');
            filterBar.appendChild(chip);
        });
    }

    // 1. Fetch Products from Firestore
    async function loadProducts() {
        try {
            const snapshot = await db.collection('products')
                .get();

            const nextProducts = [];
            const categories = new Set();
            const seenJan = new Set(); // JAN重複排除

            snapshot.forEach(doc => {
                const data = doc.data();
                // visible: false の商品は非表示
                if (data.visible === false) return;
                // 同一JANコードの商品は除外
                if (data.jan && seenJan.has(data.jan)) return;
                if (data.jan) seenJan.add(data.jan);
                nextProducts.push({ id: doc.id, ...data });
                if (data.category) categories.add(data.category);
            });

            allProducts = nextProducts;
            const categoryList = Array.from(categories);
            buildCategoryFilters(categoryList);
            saveProductsToCache(allProducts, categoryList);

            productsLoaded = true;
            renderProducts(getFilteredProducts());
            loadingEl.style.display = 'none';
        } catch (err) {
            console.error('商品読み込みエラー:', err.message, err.code);
            loadingEl.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #fff3cd; border-radius: 8px;">
                    <p style="margin: 0.5rem 0; color: #856404; font-weight: 600;">商品の読み込みに失敗しました</p>
                    <p style="margin: 0.5rem 0; color: #856404; font-size: 0.9rem;">${err.message || 'エラーが発生しました'}</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #ffc107; border: none; border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">
                        リロード
                    </button>
                </div>
            `;
        }
    }

    // 2. Render Product Cards
    function renderProducts(products) {
        productGrid.innerHTML = '';
        if (products.length === 0) {
            emptyEl.style.display = 'block';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        emptyEl.style.display = 'none';

        const isLoggedIn = !!currentUser;
        const fragment = document.createDocumentFragment();

        products.slice(0, renderLimit).forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';

            // Price & cart area: visible only when logged in
            let bottomHTML;
            if (isLoggedIn) {
                bottomHTML = `
                    <div class="product-bottom">
                        <span class="product-price">¥${(p.price || 0).toLocaleString()}</span>
                        <button class="add-to-cart-btn" ${p.stock <= 0 ? 'disabled' : ''} data-id="${p.id}">
                            ${p.stock <= 0 ? '売切' : 'カートに追加'}
                        </button>
                    </div>
                `;
            } else {
                bottomHTML = `
                    <div class="product-bottom price-gate">
                        <a href="/login.html?redirect=/" class="login-to-see-price">
                            🔒 価格を見る
                        </a>
                    </div>
                `;
            }

            const imageHtml = p.imageUrl
                ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy" decoding="async">`
                : '<span class="no-img">No Image</span>';

            card.innerHTML = `
                <div class="product-img">
                    ${imageHtml}
                    ${p.stock <= 0 ? '<span class="out-of-stock-badge">在庫切れ</span>' : ''}
                </div>
                <div class="product-info">
                    <span class="product-category">${p.category || ''}</span>
                    <h3 class="product-name">${p.name}</h3>
                    ${bottomHTML}
                </div>
            `;
            fragment.appendChild(card);
        });
        productGrid.appendChild(fragment);

        if (loadMoreBtn) {
            if (products.length > renderLimit) {
                loadMoreBtn.style.display = 'inline-flex';
                loadMoreBtn.textContent = `さらに表示 (${products.length - renderLimit}件)`;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }

    // 3. Category Filter
    if (filterBar) {
        filterBar.addEventListener('click', (e) => {
            if (!e.target.classList.contains('filter-chip')) return;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.dataset.category;
            renderLimit = INITIAL_RENDER_COUNT;
            renderProducts(getFilteredProducts());
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            renderLimit += INITIAL_RENDER_COUNT;
            renderProducts(getFilteredProducts());
        });
    }

    window.addEventListener('ec:search', (e) => {
        searchQuery = (e.detail || '').trim();
        renderLimit = INITIAL_RENDER_COUNT;
        renderProducts(getFilteredProducts());
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = (e.target.value || '').trim();
            renderLimit = INITIAL_RENDER_COUNT;
            renderProducts(getFilteredProducts());
        });
    }

    productGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (!btn) return;

        const user = Auth.currentUser();
        if (!user) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        const id = btn.dataset.id;
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        Cart.add({ id: product.id, name: product.name, price: product.price || 0, imageUrl: product.imageUrl });
        renderCartDrawer();
        openCart();
        btn.textContent = '✓ 追加済';
        btn.classList.add('added');
        setTimeout(() => {
            btn.textContent = 'カートに追加';
            btn.classList.remove('added');
        }, 1200);
    });

    // 4. Cart Drawer
    function openCart() {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('open');
    }
    function closeCart() {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
    }

    function renderCartDrawer() {
        const items = Cart.getAll();
        if (items.length === 0) {
            cartItemsEl.innerHTML = '<p class="cart-empty">カートは空です</p>';
        } else {
            cartItemsEl.innerHTML = items.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">¥${(item.price * item.qty).toLocaleString()}</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="changeQty('${item.id}', ${item.qty - 1})">−</button>
                        <span class="qty-display">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty('${item.id}', ${item.qty + 1})">+</button>
                        <button class="remove-btn" onclick="removeItem('${item.id}')">✕</button>
                    </div>
                </div>
            `).join('');
        }
        cartTotalEl.textContent = `¥${Cart.getTotal().toLocaleString()}`;
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.style.pointerEvents = items.length === 0 ? 'none' : 'auto';
            checkoutBtn.style.opacity = items.length === 0 ? '0.5' : '1';
        }
    }

    // Global helpers for inline handlers
    window.changeQty = (id, qty) => {
        if (qty < 1) { Cart.remove(id); } else { Cart.updateQty(id, qty); }
        renderCartDrawer();
    };
    window.removeItem = (id) => {
        Cart.remove(id);
        renderCartDrawer();
    };

    document.getElementById('cart-toggle').addEventListener('click', () => { renderCartDrawer(); openCart(); });
    document.getElementById('cart-close').addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Init
    loadCachedProducts();
    loadProducts();
    renderCartDrawer();
});
