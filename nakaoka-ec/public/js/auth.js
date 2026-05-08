/**
 * Auth Module — Firebase Authentication + Firestore User Profile
 */
const Auth = (() => {
    const auth = firebase.auth();

    // ログイン
    async function login(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
    }

    // 新規登録 + プロフィール保存
    async function register(email, password, profile) {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            company: profile.company || '',
            name: profile.name,
            email: email,
            phone: profile.phone,
            zip: profile.zip || '',
            address: profile.address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return cred;
    }

    // ログアウト
    async function logout() {
        return auth.signOut();
    }

    // パスワードリセットメール送信
    async function resetPassword(email) {
        return auth.sendPasswordResetEmail(email);
    }

    // 認証状態変化リスナー
    function onAuthChange(callback) {
        auth.onAuthStateChanged(callback);
    }

    // 現在のユーザー取得
    function currentUser() {
        return auth.currentUser;
    }

    // Firestoreからプロフィール取得
    async function getUserProfile(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    }

    // プロフィール更新
    async function updateProfile(uid, data) {
        return db.collection('users').doc(uid).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // ヘッダーUI更新（共通ヘルパー）
    function updateHeaderUI(user) {
        const authLink = document.getElementById('auth-link');
        if (!authLink) return;

        if (user) {
            authLink.href = '/mypage.html';
            authLink.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> マイページ';
        } else {
            authLink.href = '/login.html';
            authLink.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> ログイン';
        }
    }

    // 認証ガード（未ログインならリダイレクト）
    function requireAuth(redirectUrl = '/login.html') {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(user => {
                if (!user) {
                    window.location.href = redirectUrl + '?redirect=' + encodeURIComponent(window.location.pathname);
                } else {
                    resolve(user);
                }
            });
        });
    }

    return {
        login, register, logout, resetPassword,
        onAuthChange, currentUser, getUserProfile, updateProfile,
        updateHeaderUI, requireAuth
    };
})();
