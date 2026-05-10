/**
 * Checkout — Order submission to Firestore (with Auth)
 */

// LINE Messaging API 通知キュー送信（非同期）
async function notifyLineOrder(orderId, orderData) {
  try {
    // メッセージを作成
    const itemsText = orderData.items
      .map(i => `・${i.name} × ${i.qty} = ¥${(i.price * i.qty).toLocaleString()}`)
      .join('\n');

    const message = `
【新規注文】
注文番号: ${orderId.substring(0, 8)}
顧客名: ${orderData.name}${orderData.company ? `（${orderData.company}）` : ''}

商品:
${itemsText}

合計: ¥${orderData.total.toLocaleString()}

配送先: ${orderData.address}
メール: ${orderData.email}
電話: ${orderData.phone}

※管理画面で詳細を確認してください
    `.trim();

    // Firestore に通知キューを保存（Callable Function で処理）
    await db.collection('lineNotifications').add({
      orderId: orderId,
      message: message,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

        console.log('LINE通知キューに追加しました');
  } catch (err) {
        console.warn('LINE通知キュー追加エラー:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total-price');
    const orderForm = document.getElementById('order-form');

    // Require login to access checkout
    const user = await Auth.requireAuth();
    const profile = await Auth.getUserProfile(user.uid);

    // Auto-fill from profile
    if (profile) {
        document.getElementById('company').value = profile.company || '';
        document.getElementById('name').value = profile.name || '';
        document.getElementById('email').value = profile.email || user.email;
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('zip').value = profile.zip || '';
        document.getElementById('address').value = profile.address || '';
    }

    // Render cart summary
    function renderCheckoutSummary() {
        const items = Cart.getAll();
        if (items.length === 0) {
            checkoutItems.innerHTML = '<p>カートが空です。<a href="/">ショップに戻る</a></p>';
            return;
        }
        checkoutItems.innerHTML = items.map(item => `
            <div class="checkout-item">
                <span class="checkout-item-name">${item.name} × ${item.qty}</span>
                <span class="checkout-item-price">¥${(item.price * item.qty).toLocaleString()}</span>
            </div>
        `).join('');
        checkoutTotal.textContent = `¥${Cart.getTotal().toLocaleString()}`;
    }

    // Submit order
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-order');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        try {
            const items = Cart.getAll();
            if (items.length === 0) {
                alert('カートが空です。');
                return;
            }

            const orderData = {
                userId: user.uid,
                company: document.getElementById('company').value,
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                zip: document.getElementById('zip').value,
                address: document.getElementById('address').value,
                notes: document.getElementById('notes').value,
                items: items.map(i => ({
                    productId: i.id,
                    name: i.name,
                    price: i.price,
                    qty: i.qty
                })),
                total: Cart.getTotal(),
                status: '未処理',
                paymentStatus: '未決済',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection('orders').add(orderData);
            
            // LINE に注文通知を送信（非同期・エラーは無視）
            notifyLineOrder(docRef.id, orderData);
            
            Cart.clear();
            window.location.href = `/thanks.html?id=${docRef.id}`;

        } catch (err) {
            console.error('注文エラー:', err);
            alert('注文の送信に失敗しました。もう一度お試しください。');
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    });

    renderCheckoutSummary();
});
