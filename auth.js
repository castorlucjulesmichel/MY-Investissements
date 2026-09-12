import { auth, db, ADMIN_UID } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { bindLanguageSelector } from './i18n.js';

bindLanguageSelector();
const $=s=>document.querySelector(s); const msg=$('#authMessage');
function show(text,ok=false){msg.textContent=text;msg.className=`form-message ${ok?'ok':'error'}`;}
function go(uid){location.href=uid===ADMIN_UID?'admin.html':'investisseur.html';}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const login=btn.dataset.tab==='login';$('#loginForm').classList.toggle('hidden',!login);$('#registerForm').classList.toggle('hidden',login);msg.textContent='';
}));

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();show('Connexion... ',true);try{const r=await signInWithEmailAndPassword(auth,$('#loginEmail').value.trim(),$('#loginPassword').value);go(r.user.uid);}catch(err){show('Connexion impossible. Vérifiez votre e-mail et votre mot de passe.');}});

$('#registerForm').addEventListener('submit',async e=>{e.preventDefault();show('Création du compte...',true);try{
  const name=$('#registerName').value.trim(); const r=await createUserWithEmailAndPassword(auth,$('#registerEmail').value.trim(),$('#registerPassword').value);
  await setDoc(doc(db,'users',r.user.uid),{uid:r.user.uid,name,email:r.user.email,role:'investor',status:'active',balances:{HTG:0,USD:0,EUR:0,CAD:0},createdAt:serverTimestamp()});
  go(r.user.uid);
}catch(err){console.error(err);show(err.code==='auth/email-already-in-use'?'Cette adresse e-mail est déjà utilisée.':'Inscription impossible. Vérifiez les informations et les règles Firestore.');}});

onAuthStateChanged(auth,async user=>{if(!user)return;try{const snap=await getDoc(doc(db,'users',user.uid));if(user.uid===ADMIN_UID||snap.exists())go(user.uid);}catch(_){}});
