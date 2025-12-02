import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBRsCVqzxtmMFLieiAyE-zCKaD60ndXrbo",
  authDomain: "meudindin-pwa.firebaseapp.com",
  projectId: "meudindin-pwa",
  storageBucket: "meudindin-pwa.firebasestorage.app",
  messagingSenderId: "370611500248",
  appId: "1:370611500248:web:b1b6bc484561a5d9bd53ad",
  measurementId: "G-5M992S64QN",
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
