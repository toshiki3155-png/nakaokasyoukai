// Firebase Configuration — Nakaoka EC
const firebaseConfig = {
    apiKey: "AIzaSyDo_CgAO09e86zWRc8jvY0gGnnc_n6GZ3Q",
    authDomain: "nakaoka-ec.firebaseapp.com",
    projectId: "nakaoka-ec",
    storageBucket: "nakaoka-ec.firebasestorage.app",
    messagingSenderId: "196331360712",
    appId: "1:196331360712:web:963b0c5f3fe4006768f0fd"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
