/**
 * Postal Code Auto-Fill Utility
 * zipcloud API (https://zipcloud.ibsnet.co.jp/api/search) を使用
 * 郵便番号入力で住所を自動取得する
 */
const PostalCode = (() => {
    const API_URL = 'https://zipcloud.ibsnet.co.jp/api/search';

    /**
     * 郵便番号から住所を取得
     * @param {string} zipcode - 郵便番号（ハイフン有無どちらも可）
     * @returns {Promise<{address1: string, address2: string, address3: string, full: string}|null>}
     */
    async function lookup(zipcode) {
        const cleaned = zipcode.replace(/[^0-9]/g, '');
        if (cleaned.length !== 7) return null;

        try {
            const res = await fetch(`${API_URL}?zipcode=${cleaned}`);
            const data = await res.json();

            if (data.status !== 200 || !data.results || data.results.length === 0) {
                return null;
            }

            const r = data.results[0];
            return {
                address1: r.address1,  // 都道府県
                address2: r.address2,  // 市区町村
                address3: r.address3,  // 町域
                full: r.address1 + r.address2 + r.address3
            };
        } catch (err) {
            console.error('郵便番号API エラー:', err);
            return null;
        }
    }

    /**
     * 郵便番号入力フィールドと住所フィールドを紐づける
     * @param {string} zipInputId - 郵便番号inputのID
     * @param {string} addressInputId - 住所inputのID
     */
    function bind(zipInputId, addressInputId) {
        const zipInput = document.getElementById(zipInputId);
        const addressInput = document.getElementById(addressInputId);
        if (!zipInput || !addressInput) return;

        // 検索実行
        async function doLookup() {
            const val = zipInput.value.replace(/[^0-9]/g, '');
            if (val.length !== 7) return;

            zipInput.classList.add('zip-loading');
            const result = await lookup(val);
            zipInput.classList.remove('zip-loading');

            if (result) {
                addressInput.value = result.full;
                addressInput.focus();
                // フラッシュアニメーション
                addressInput.classList.add('zip-found');
                setTimeout(() => addressInput.classList.remove('zip-found'), 1500);
            }
        }

        // 7桁入力されたら自動で検索
        zipInput.addEventListener('input', () => {
            const val = zipInput.value.replace(/[^0-9]/g, '');
            if (val.length === 7) doLookup();
        });

        // フォーカスアウト時に検索
        zipInput.addEventListener('blur', doLookup);
    }

    return { lookup, bind };
})();
