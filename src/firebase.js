import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAA30KuXwW1y5xhQuSZGI7VTcOrQVeEu5w", // Substitua pelo seu
  authDomain: "vislumbrecrm.firebaseapp.com", // Substitua pelo seu
  projectId: "vislumbrecrm", // Substitua pelo seu
  storageBucket: "vislumbrecrm.firebasestorage.app",
  messagingSenderId: "28975594738",
  appId: "1:28975594738:web:72ebf5b916fa724146646b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
