/**
 * 管理ダッシュボード — 商品管理 + サイト設定
 * Firebaseストレージで画像アップロード対応
 */

const AdminDashboard = {
  currentTab: 'dashboard',
  products: [],
  siteConfig: {},

  // ────────────────────── INIT ──────────────────────
  async init() {
    try {
      await Auth.requireAuth('/admin-login.html');
      this.setupTabNavigation();
      this.setupProductForm();
      this.setupSettingsForm();
      this.setupImageUpload();
      await this.loadAllData();
      this.renderDashboard();
    } catch (err) {
      console.error('初期化エラー:', err);
    }
  },

  // ────────────────────── TAB管理 ──────────────────────
  setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      });
    });
  },

  switchTab(tabName) {
    // タブボタン更新
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // パネル表示更新
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tabName}`).classList.add('active');

    this.currentTab = tabName;

    // タブごとの初期化処理
    if (tabName === 'products') {
      this.renderProductList();
    } else if (tabName === 'settings') {
      this.loadSettingsForm();
    }
  },

  // ────────────────────── ダッシュボード ──────────────────────
  async renderDashboard() {
    const stats = await this.getStats();
    const html = `
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-icon">📦</div>
          <div class="stat-number">${stats.totalProducts}</div>
          <div class="stat-label">登録商品</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">👥</div>
          <div class="stat-number">${stats.totalOrders}</div>
          <div class="stat-label">注文</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">💰</div>
          <div class="stat-number">¥${(stats.totalRevenue || 0).toLocaleString()}</div>
          <div class="stat-label">売上</div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">⚠️</div>
          <div class="stat-number">${stats.lowStockCount}</div>
          <div class="stat-label">在庫不足</div>
        </div>
      </div>

      <div class="recent-section">
        <h3>最新の注文</h3>
        <div id="recent-orders">
          <div class="loading-state"><span class="spinner-sm"></span>読み込み中...</div>
        </div>
      </div>
    `;
    document.getElementById('panel-dashboard').innerHTML = html;
    this.loadRecentOrders();
  },

  async getStats() {
    let totalProducts = 0;
    let lowStockCount = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    try {
      // 商品統計
      const prodSnap = await db.collection('products').get();
      totalProducts = prodSnap.size;
      prodSnap.forEach(doc => {
        const stock = doc.data().stock || 0;
        if (stock < 10) lowStockCount++;
      });

      // 注文統計
      const orderSnap = await db.collection('orders').get();
      totalOrders = orderSnap.size;
      orderSnap.forEach(doc => {
        const total = doc.data().total || 0;
        totalRevenue += total;
      });
    } catch (err) {
      console.error('統計取得エラー:', err);
    }

    return { totalProducts, lowStockCount, totalOrders, totalRevenue };
  },

  async loadRecentOrders() {
    try {
      const snapshot = await db.collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      let html = '';
      if (snapshot.empty) {
        html = '<p class="empty-text">注文がありません</p>';
      } else {
        snapshot.forEach(doc => {
          const order = doc.data();
          const date = order.createdAt?.toDate?.() || new Date();
          const dateStr = date.toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
          });
          html += `
            <div class="order-item">
              <div class="order-header">
                <span class="order-id">#${doc.id.substring(0, 8)}</span>
                <span class="order-date">${dateStr}</span>
              </div>
              <div class="order-customer">${order.customerName || '不明'} 様</div>
              <div class="order-total">¥${(order.total || 0).toLocaleString()}</div>
              <span class="order-status status-${order.status || '未処理'}">${order.status || '未処理'}</span>
            </div>
          `;
        });
      }
      document.getElementById('recent-orders').innerHTML = html;
    } catch (err) {
      console.error('注文取得エラー:', err);
      document.getElementById('recent-orders').innerHTML = '<p class="error-text">読み込みエラー</p>';
    }
  },

  // ────────────────────── 商品フォーム ──────────────────────
  setupProductForm() {
    const form = document.getElementById('product-form');
    const toggleBtn = document.getElementById('toggle-product-form');
    const formWrap = document.getElementById('product-form-wrap');
    const cancelBtn = document.getElementById('cancel-product-form');
    const imageInput = document.getElementById('product-image-input');
    const imagePreview = document.getElementById('image-preview');

    // フォーム表示トグル
    toggleBtn.addEventListener('click', () => {
      formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
      toggleBtn.textContent = formWrap.style.display === 'none' ? '+ 商品追加' : '− 閉じる';
    });

    cancelBtn.addEventListener('click', () => {
      form.reset();
      formWrap.style.display = 'none';
      toggleBtn.textContent = '+ 商品追加';
      imagePreview.innerHTML = '';
    });

    // 画像プレビュー
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          imagePreview.innerHTML = `<img src="${evt.target.result}" alt="プレビュー">`;
        };
        reader.readAsDataURL(file);
      }
    });

    // フォーム送信
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoading = submitBtn.querySelector('.btn-loading');

      try {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        const productData = {
          name: document.getElementById('product-name').value.trim(),
          price: parseInt(document.getElementById('product-price').value),
          stock: parseInt(document.getElementById('product-stock').value) || 50,
          category: document.getElementById('product-category').value.trim(),
          description: document.getElementById('product-description').value.trim(),
          jan: document.getElementById('product-jan').value.trim() || null,
          visible: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // 画像アップロード
        if (imageInput.files[0]) {
          const fileName = `products/${Date.now()}_${imageInput.files[0].name}`;
          const uploadTask = storage.ref(fileName).put(imageInput.files[0]);
          const snapshot = await uploadTask;
          productData.imageUrl = await snapshot.ref.getDownloadURL();
        }

        // Firestoreに保存
        await db.collection('products').add(productData);

        // 成功メッセージ
        document.getElementById('product-success').style.display = 'block';
        document.getElementById('product-success').textContent = '✓ 商品を登録しました';

        setTimeout(() => {
          form.reset();
          imagePreview.innerHTML = '';
          document.getElementById('product-success').style.display = 'none';
          formWrap.style.display = 'none';
          toggleBtn.textContent = '+ 商品追加';
          this.renderProductList();
        }, 1500);
      } catch (err) {
        console.error('商品登録エラー:', err);
        document.getElementById('product-error').style.display = 'block';
        document.getElementById('product-error').textContent = '⨯ ' + err.message;
      } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    });
  },

  async loadData() {
    try {
      const snapshot = await db.collection('products').get();
      this.products = [];
      snapshot.forEach(doc => {
        this.products.push({ id: doc.id, ...doc.data() });
      });

      const configSnap = await db.collection('config').doc('site').get();
      this.siteConfig = configSnap.exists ? configSnap.data() : {};
    } catch (err) {
      console.error('データ読み込みエラー:', err);
    }
  },

  async renderProductList() {
    const listEl = document.getElementById('product-list');
    if (!listEl) return;

    try {
      await this.loadData();
      let html = '';

      if (this.products.length === 0) {
        html = '<div class="empty-text">商品がまだ登録されていません</div>';
      } else {
        html += '<div class="product-table-header">';
        html += '<div class="col-img">画像</div>';
        html += '<div class="col-info">商品情報</div>';
        html += '<div class="col-price">価格/在庫</div>';
        html += '<div class="col-actions">操作</div>';
        html += '</div>';

        this.products.forEach(p => {
          const stockClass = (p.stock || 0) < 10 ? 'low-stock' : '';
          html += `
            <div class="product-table-row">
              <div class="col-img">
                ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : '<span class="no-image">📷</span>'}
              </div>
              <div class="col-info">
                <div class="product-name">${p.name}</div>
                <div class="product-category">${p.category || '-'}</div>
                ${p.jan ? `<div class="product-jan">JAN: ${p.jan}</div>` : ''}
              </div>
              <div class="col-price">
                <div>¥${(p.price || 0).toLocaleString()}</div>
                <div class="stock-badge ${stockClass}">在庫: ${p.stock ?? '-'}</div>
              </div>
              <div class="col-actions">
                <button class="edit-product-btn" data-id="${p.id}">編集</button>
                <button class="delete-product-btn" data-id="${p.id}" data-name="${p.name}">削除</button>
              </div>
            </div>
          `;
        });
      }

      listEl.innerHTML = html;

      // イベントハンドラ
      listEl.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => this.openEditForm(btn.dataset.id));
      });

      listEl.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm(`「${btn.dataset.name}」を削除しますか？`)) {
            await this.deleteProduct(btn.dataset.id);
          }
        });
      });
    } catch (err) {
      console.error('商品一覧レンダリングエラー:', err);
      listEl.innerHTML = '<p class="error-text">読み込みエラー</p>';
    }
  },

  async deleteProduct(productId) {
    try {
      await db.collection('products').doc(productId).delete();
      this.renderProductList();
    } catch (err) {
      alert('削除失敗: ' + err.message);
    }
  },

  openEditForm(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-jan').value = product.jan || '';

    if (product.imageUrl) {
      document.getElementById('image-preview').innerHTML = `<img src="${product.imageUrl}" alt="${product.name}">`;
    }

    const form = document.getElementById('product-form');
    form.dataset.editId = productId;

    document.getElementById('product-form-wrap').style.display = 'block';
    document.getElementById('toggle-product-form').textContent = '− 閉じる';
    document.querySelector('button[type="submit"]').textContent = '更新';
  },

  // ────────────────────── 設定フォーム ──────────────────────
  setupSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;

        const settingsData = {
          siteName: document.getElementById('site-name').value,
          siteDescription: document.getElementById('site-description').value,
          contactEmail: document.getElementById('contact-email').value,
          primaryColor: document.getElementById('primary-color').value,
          secondaryColor: document.getElementById('secondary-color').value,
          logoUrl: document.getElementById('logo-url').value,
          shippingFee: parseInt(document.getElementById('shipping-fee').value) || 0,
          freeShippingThreshold: parseInt(document.getElementById('free-shipping-threshold').value) || 10000,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('config').doc('site').set(settingsData, { merge: true });

        document.getElementById('settings-success').style.display = 'block';
        setTimeout(() => {
          document.getElementById('settings-success').style.display = 'none';
        }, 2000);
      } catch (err) {
        alert('設定保存エラー: ' + err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });
  },

  async loadSettingsForm() {
    try {
      const configSnap = await db.collection('config').doc('site').get();
      const config = configSnap.exists ? configSnap.data() : {};

      document.getElementById('site-name').value = config.siteName || '中岡商会';
      document.getElementById('site-description').value = config.siteDescription || '';
      document.getElementById('contact-email').value = config.contactEmail || '';
      document.getElementById('primary-color').value = config.primaryColor || '#000000';
      document.getElementById('secondary-color').value = config.secondaryColor || '#666666';
      document.getElementById('logo-url').value = config.logoUrl || '';
      document.getElementById('shipping-fee').value = config.shippingFee || 0;
      document.getElementById('free-shipping-threshold').value = config.freeShippingThreshold || 10000;
    } catch (err) {
      console.error('設定読み込みエラー:', err);
    }
  }
};

// ────────────────────── INIT ON LOAD ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  AdminPanel.init();
});
