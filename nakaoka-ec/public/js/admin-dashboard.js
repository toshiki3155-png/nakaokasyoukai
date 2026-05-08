/**
 * 管理ダッシュボード — 商品管理 + サイト設定
 * Firebaseストレージで画像アップロード対応
 */

const AdminDashboard = {
  products: [],
  siteConfig: {},
  productSearch: '',
  productVisibilityFilter: 'all',

  // ────────────────────── INIT ──────────────────────
  async init() {
    try {
      await Auth.requireAuth('/admin-login.html');
      this.setupLogout();
      this.setupTabNavigation();
      this.setupProductForm();
      this.setupProductFilters();
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
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      });
    });
  },

  setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
      try {
        await Auth.logout();
        window.location.href = '/admin-login.html';
      } catch (err) {
        alert('ログアウトに失敗しました: ' + err.message);
      }
    });
  },

  switchTab(tabName) {
    // タブボタン更新
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // パネル表示更新
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tabName}`).classList.add('active');

    // タブごとの初期化処理
    if (tabName === 'products') {
      this.renderProductList();
    } else if (tabName === 'settings') {
      this.loadSettingsForm();
    } else if (tabName === 'line-notifications') {
      this.renderLineNotifications();
    }
  },

  // ────────────────────── ダッシュボード ──────────────────────
  async renderDashboard() {
    const stats = await this.getStats();
    const statsGrid = document.getElementById('stats-grid');
    
    statsGrid.innerHTML = `
      <div class="stat-box">
        <div class="stat-icon">📦</div>
        <div class="stat-number">${stats.totalProducts}</div>
        <div class="stat-label">登録商品</div>
      </div>
      <div class="stat-box">
        <div class="stat-icon">📋</div>
        <div class="stat-number">${stats.totalOrders}</div>
        <div class="stat-label">注文数</div>
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
    `;
    
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
    const container = document.getElementById('recent-orders');
    if (!container) return;

    try {
      const snapshot = await db.collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      if (snapshot.empty) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>注文がまだありません</p></div>';
        return;
      }

      let html = '';
      snapshot.forEach(doc => {
        const order = doc.data();
        const date = order.createdAt?.toDate?.() || new Date();
        const dateStr = date.toLocaleString('ja-JP');
        
        html += `
          <div style="padding: 1rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; margin-bottom: 0.3rem;">${order.name || order.customerName || '不明'} 様</div>
              <div style="font-size: 0.85rem; color: var(--text-light);">${dateStr}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.3rem;">¥${(order.total || 0).toLocaleString()}</div>
              <span style="display: inline-block; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #e6f3ff; color: #0066cc;">${order.status || '未処理'}</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (err) {
      console.error('注文取得エラー:', err);
      container.innerHTML = '<p style="color: var(--text-light);">注文の読み込みに失敗しました</p>';
    }
  },

  // ────────────────────── 商品フォーム ──────────────────────
  setupProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;

    const toggleBtn = document.getElementById('toggle-form');
    const formWrap = document.getElementById('product-form-wrap');
    const cancelBtn = document.getElementById('cancel-form');

    // フォーム表示トグル
    toggleBtn.addEventListener('click', () => {
      const isHidden = formWrap.style.display === 'none';
      formWrap.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? '- 閉じる' : '+ 展開';
    });

    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
      form.reset();
      document.getElementById('image-preview').innerHTML = '';
      formWrap.style.display = 'none';
      toggleBtn.textContent = '+ 展開';
    });

    // フォーム送信
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleProductSubmit(e);
    });
  },

  setupProductFilters() {
    const searchEl = document.getElementById('product-search');
    const filterEl = document.getElementById('product-visibility-filter');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        this.productSearch = (e.target.value || '').trim().toLowerCase();
        this.renderProductList();
      });
    }
    if (filterEl) {
      filterEl.addEventListener('change', (e) => {
        this.productVisibilityFilter = e.target.value || 'all';
        this.renderProductList();
      });
    }
  },

  setupImageUpload() {
    const uploadArea = document.getElementById('image-upload');
    const input = document.getElementById('product-image-input');
    const preview = document.getElementById('image-preview');

    if (!uploadArea || !input) return;

    // クリックでファイル選択
    uploadArea.addEventListener('click', () => input.click());

    // ファイル選択時
    input.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.previewImage(e.target.files[0], preview);
      }
    });

    // ドラッグ&ドロップ
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        this.previewImage(e.dataTransfer.files[0], preview);
      }
    });
  },

  previewImage(file, previewEl) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      previewEl.innerHTML = `<img src="${evt.target.result}" alt="プレビュー">`;
    };
    reader.readAsDataURL(file);
  },

  async handleProductSubmit(e) {
    const form = e.target;
    const successMsg = document.getElementById('product-success');
    const errorMsg = document.getElementById('product-error');
    const input = document.getElementById('product-image-input');

    // メッセージ非表示
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
      const editId = form.dataset.editId;
      const productData = {
        name: document.getElementById('product-name').value.trim(),
        price: parseInt(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value) || 50,
        category: document.getElementById('product-category').value.trim(),
        description: document.getElementById('product-description').value.trim(),
        jan: document.getElementById('product-jan').value.trim() || '',
        visible: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (!editId) {
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      }

      // 画像アップロード
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const fileName = `products/${Date.now()}_${file.name}`;
        const uploadTask = storage.ref(fileName).put(file);
        const snapshot = await uploadTask;
        productData.imageUrl = await snapshot.ref.getDownloadURL();
      }

      // Firestoreに保存
      if (editId) {
        await db.collection('products').doc(editId).set(productData, { merge: true });
      } else {
        await db.collection('products').add(productData);
      }

      // 成功メッセージ
      successMsg.textContent = editId
        ? `✓ 「${productData.name}」を更新しました`
        : `✓ 「${productData.name}」を登録しました`;
      successMsg.classList.add('success');
      successMsg.classList.remove('error');
      successMsg.style.display = 'block';

      // フォーム初期化
      setTimeout(() => {
        form.reset();
        document.getElementById('image-preview').innerHTML = '';
        document.getElementById('product-form-wrap').style.display = 'none';
        document.getElementById('toggle-form').textContent = '+ 展開';
        delete form.dataset.editId;
        this.renderProductList();
      }, 1500);
    } catch (err) {
      errorMsg.textContent = `⨯ エラー: ${err.message}`;
      errorMsg.classList.add('error');
      errorMsg.classList.remove('success');
      errorMsg.style.display = 'block';
    }
  },

  async loadAllData() {
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
      await this.loadAllData();

      if (this.products.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>商品がまだ登録されていません</p></div>';
        return;
      }

      const filteredProducts = this.products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const jan = (p.jan || '').toLowerCase();
        const visible = p.visible !== false;
        const lowStock = (p.stock || 0) < 10;

        const keywordMatched = !this.productSearch
          || name.includes(this.productSearch)
          || category.includes(this.productSearch)
          || jan.includes(this.productSearch);

        if (!keywordMatched) return false;

        if (this.productVisibilityFilter === 'visible') return visible;
        if (this.productVisibilityFilter === 'hidden') return !visible;
        if (this.productVisibilityFilter === 'low-stock') return lowStock;
        return true;
      });

      if (filteredProducts.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>条件に合う商品がありません</p></div>';
        return;
      }

      let html = '<table class="product-table"><thead><tr>';
      html += '<th>画像</th><th>商品名</th><th>価格</th><th>在庫</th><th>カテゴリ</th><th>公開</th><th>操作</th>';
      html += '</tr></thead><tbody>';

      filteredProducts.forEach(p => {
        const stockClass = (p.stock || 0) < 10 ? 'style="color: #e53e3e; font-weight: 600;"' : '';
        const isVisible = p.visible !== false;
        html += `
          <tr>
            <td>${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" class="product-img">` : '<span style="color: #cbd5e0;">📷</span>'}</td>
            <td style="font-weight: 500;">${p.name}</td>
            <td style="text-align: right;">¥${(p.price || 0).toLocaleString()}</td>
            <td style="text-align: center;" ${stockClass}>${p.stock ?? '-'}</td>
            <td><span style="display: inline-block; background: #edf2f7; color: #2d3748; padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.85rem;">${p.category || '-'}</span></td>
            <td style="text-align:center;">${isVisible ? '✅' : '🚫'}</td>
            <td>
              <div class="product-actions">
                <button class="edit-btn product-toggle-visible-btn" data-id="${p.id}">${isVisible ? '非公開' : '公開'}</button>
                <button class="edit-btn product-edit-btn" data-id="${p.id}">編集</button>
                <button class="delete-btn product-delete-btn" data-id="${p.id}" data-name="${p.name}">削除</button>
              </div>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      listEl.innerHTML = html;

      // イベントハンドラ
      listEl.querySelectorAll('.product-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm(`「${btn.dataset.name}」を削除しますか？`)) {
            await this.deleteProduct(btn.dataset.id);
          }
        });
      });

      listEl.querySelectorAll('.product-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => this.editProduct(btn.dataset.id));
      });

      listEl.querySelectorAll('.product-toggle-visible-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await this.toggleProductVisible(btn.dataset.id);
        });
      });
    } catch (err) {
      console.error('商品一覧レンダリングエラー:', err);
      listEl.innerHTML = '<p style="color: #e53e3e;">エラー: 商品の読み込みに失敗しました</p>';
    }
  },

  async toggleProductVisible(productId) {
    try {
      const product = this.products.find((p) => p.id === productId);
      if (!product) return;
      const nextVisible = product.visible === false;
      await db.collection('products').doc(productId).set({
        visible: nextVisible,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      await this.renderProductList();
    } catch (err) {
      alert('公開状態の更新に失敗しました: ' + err.message);
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

  editProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const form = document.getElementById('product-form');
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock || 50;
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-jan').value = product.jan || '';

    if (product.imageUrl) {
      document.getElementById('image-preview').innerHTML = `<img src="${product.imageUrl}" alt="${product.name}">`;
    }

    form.dataset.editId = productId;
    document.getElementById('product-form-wrap').style.display = 'block';
    document.getElementById('toggle-form').textContent = '- 閉じる';
  },

  // ────────────────────── 設定フォーム ──────────────────────
  setupSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSettingsSubmit();
    });
  },

  async handleSettingsSubmit() {
    const form = document.getElementById('settings-form');
    const successMsg = document.getElementById('settings-success');
    const errorMsg = document.getElementById('settings-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
      submitBtn.disabled = true;

      const settingsData = {
        siteName: document.getElementById('site-name').value.trim(),
        siteDescription: document.getElementById('site-description').value.trim(),
        contactEmail: document.getElementById('contact-email').value.trim(),
        primaryColor: document.getElementById('primary-color').value,
        secondaryColor: document.getElementById('secondary-color').value,
        shippingFee: parseInt(document.getElementById('shipping-fee').value) || 0,
        freeShippingThreshold: parseInt(document.getElementById('free-shipping-threshold').value) || 10000,
        lineChannelAccessToken: document.getElementById('line-channel-access-token')?.value.trim() || '',
        lineUserId: document.getElementById('line-user-id')?.value.trim() || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('config').doc('site').set(settingsData, { merge: true });

      successMsg.textContent = '✓ 設定を保存しました';
      successMsg.classList.add('success');
      successMsg.classList.remove('error');
      successMsg.style.display = 'block';

      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 3000);
    } catch (err) {
      errorMsg.textContent = `⨯ エラー: ${err.message}`;
      errorMsg.classList.add('error');
      errorMsg.classList.remove('success');
      errorMsg.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  },

  async loadSettingsForm() {
    try {
      const configSnap = await db.collection('config').doc('site').get();
      const config = configSnap.exists ? configSnap.data() : {};

      document.getElementById('site-name').value = config.siteName || '中岡商会';
      document.getElementById('site-description').value = config.siteDescription || '';
      document.getElementById('contact-email').value = config.contactEmail || '';
      document.getElementById('primary-color').value = config.primaryColor || '#6c5ce7';
      document.getElementById('secondary-color').value = config.secondaryColor || '#666666';
      document.getElementById('shipping-fee').value = config.shippingFee || 0;
      document.getElementById('free-shipping-threshold').value = config.freeShippingThreshold || 10000;
      
      // LINE Notify トークン
      const lineChannelTokenEl = document.getElementById('line-channel-access-token');
      if (lineChannelTokenEl) lineChannelTokenEl.value = config.lineChannelAccessToken || '';
      const lineUserIdEl = document.getElementById('line-user-id');
      if (lineUserIdEl) lineUserIdEl.value = config.lineUserId || '';
    } catch (err) {
      console.error('設定読み込みエラー:', err);
    }
  },

  // ────────────────────── LINE 通知管理 ──────────────────────
  async renderLineNotifications() {
    try {
      const config = await db.collection('config').doc('site').get();
      const configData = config.exists ? config.data() : {};

      if (!configData.lineChannelAccessToken || !configData.lineUserId) {
        document.getElementById('notifications-list').innerHTML = '';
        document.getElementById('notifications-empty').innerHTML = '⚠️ LINE Messaging API設定（トークン / ユーザーID）が未設定です';
        return;
      }

      const snapshot = await db.collection('lineNotifications')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const list = document.getElementById('notifications-list');
      list.innerHTML = '';

      if (snapshot.empty) {
        document.getElementById('notifications-empty').style.display = 'block';
      } else {
        document.getElementById('notifications-empty').style.display = 'none';

        const table = document.createElement('table');
        table.className = 'product-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th>注文ID</th>
              <th>ステータス</th>
              <th>作成日時</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;

        snapshot.docs.forEach((doc, idx) => {
          const data = doc.data();
          const status = data.status || 'pending';
          const statusLabel = {
            pending: '📤 未送信',
            sent: '✅ 送信済',
            error: '❌ エラー',
            skipped: '⏭️ スキップ'
          }[status] || status;

          const createdAt = data.createdAt
            ? new Date(data.createdAt.toDate()).toLocaleString('ja-JP')
            : '-';

          const row = table.querySelector('tbody').insertRow();
          row.innerHTML = `
            <td style="font-family: monospace; font-size: 0.85rem;">${data.orderId || '(不明)'}</td>
            <td>${statusLabel}</td>
            <td>${createdAt}</td>
            <td>
              <button class="send-notification-btn" data-doc-id="${doc.id}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                ${status === 'pending' ? '📤 送信' : '🔄 再送信'}
              </button>
            </td>
          `;
        });

        list.appendChild(table);

        // 送信ボタンの処理
        document.querySelectorAll('.send-notification-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const docId = btn.dataset.docId;
            await this.sendNotificationNow(docId);
          });
        });
      }
    } catch (err) {
      console.error('LINE 通知一覧エラー:', err);
      document.getElementById('notification-error').innerHTML = `❌ エラー: ${err.message}`;
    }
  },

  async sendNotificationNow(docId) {
    try {
      const docRef = db.collection('lineNotifications').doc(docId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        alert('通知が見つかりません');
        return;
      }

      // 手動再送は Cloud Functions 側トリガーに任せる
      await docRef.update({
        status: 'pending',
        retriedAt: firebase.firestore.FieldValue.serverTimestamp(),
        retryCount: firebase.firestore.FieldValue.increment(1)
      });
      alert('✅ 再送キューに入れました（自動送信を待機中）');
      this.renderLineNotifications();
    } catch (err) {
      console.error('LINE 送信エラー:', err);
      alert(`❌ 送信エラー: ${err.message}`);
    }
  }
};

// ────────────────────── INIT ON LOAD ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  AdminDashboard.init();
});
