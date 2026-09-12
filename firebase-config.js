import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8DoDtvzUkqoMscfe5U_CNwIp5NJXLhMY",
  authDomain: "my-investissements.firebaseapp.com",
  projectId: "my-investissements",
  storageBucket: "my-investissements.firebasestorage.app",
  messagingSenderId: "399847723113",
  appId: "1:399847723113:web:91155048944d11e3ad92f8"
};

export const ADMIN_UID = "z2GamhrwBoalboZo7jY4rzWhN482";
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
