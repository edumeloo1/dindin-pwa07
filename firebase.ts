// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: A FAZER -> Substitua pelas suas próprias chaves do Firebase
// Para obter essas chaves:
// 1. Vá para https://console.firebase.google.com/
// 2. Crie um novo projeto.
// 3. Nas configurações do projeto (ícone de engrenagem), vá para a aba "Geral".
// 4. Role para baixo até "Seus apps" e copie o objeto de configuração do seu app da web.
const firebaseConfig = {
  apiKey: "AIzaSyBRsCVqzxtmMFLieiAyE-zCKaD60ndXrbo",
  authDomain: "meudindin-pwa.firebaseapp.com",
  projectId: "meudindin-pwa",
  storageBucket: "meudindin-pwa.firebasestorage.app",
  messagingSenderId: "370611500248",
  appId: "1:370611500248:web:b1b6bc484561a5d9bd53ad",
  measurementId: "G-5M992S64QN",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exportar os serviços do Firebase para serem usados em outros lugares
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
