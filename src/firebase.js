import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <--- NOVO

// MANTENHA SUAS CHAVES AQUI (Não apague o que você já configurou)
const firebaseConfig = {
  apiKey: "AIzaSyAA30KuXwW1y5xhQuSZGI7VTcOrQVeEu5w", // Substitua pelo seu
  authDomain: "vislumbrecrm.firebaseapp.com", // Substitua pelo seu
  projectId: "vislumbrecrm", // Substitua pelo seu
  storageBucket: "vislumbrecrm.firebasestorage.app",
  messagingSenderId: "28975594738",
  appId: "1:28975594738:web:72ebf5b916fa724146646b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); // <--- Exporta o Storage
