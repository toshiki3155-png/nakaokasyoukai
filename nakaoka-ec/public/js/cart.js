/**
 * Cart Module — LocalStorage-based cart management
 */
const Cart = (() => {
    const STORAGE_KEY = 'nakaoka_cart';

    function getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch { return []; }
    }

    function save(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        updateBadge();
    }

    function add(product) {
        const items = getAll();
        const existing = items.find(i => i.id === product.id);
        if (existing) {
            existing.qty += 1;
        } else {
            items.push({ ...product, qty: 1 });
        }
        save(items);
        return items;
    }

    function remove(productId) {
        const items = getAll().filter(i => i.id !== productId);
        save(items);
        return items;
    }

    function updateQty(productId, qty) {
        const items = getAll();
        const item = items.find(i => i.id === productId);
        if (item) {
            item.qty = Math.max(1, qty);
        }
        save(items);
        return items;
    }

    function clear() {
        localStorage.removeItem(STORAGE_KEY);
        updateBadge();
    }

    function getTotal() {
        return getAll().reduce((sum, i) => sum + (i.price * i.qty), 0);
    }

    function getCount() {
        return getAll().reduce((sum, i) => sum + i.qty, 0);
    }

    function updateBadge() {
        const badge = document.getElementById('cart-count');
        if (badge) {
            const count = getCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Init badge on load
    document.addEventListener('DOMContentLoaded', updateBadge);

    return { getAll, add, remove, updateQty, clear, getTotal, getCount, updateBadge };
})();
