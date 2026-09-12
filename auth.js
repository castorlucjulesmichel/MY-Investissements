import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { bindLanguageSelector } from './i18n.js';

bindLanguageSelector();
const $=s=>document.querySelector(s),msg=$('#authMessage');
function show(text,ok=false){msg.textContent=text;msg.className=`form-message ${ok?'ok':'error'}`}
async function isAdmin(uid){const snap=await getDoc(doc(db,'admins',uid));return snap.exists()&&snap.data().active!==false}
async function routeUser(user){try{if(await isAdmin(user.uid)){location.href='admin.html';return}const snap=await getDoc(doc(db,'users',user.uid));if(snap.exists())location.href='investisseur.html'}catch(e){console.error(e);show('Accès impossible. Vérifiez la configuration Firestore.')}}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const login=btn.dataset.tab==='login';$('#loginForm').classList.toggle('hidden',!login);$('#registerForm').classList.toggle('hidden',login);msg.textContent=''}));
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();show('Connexion...',true);try{const r=await signInWithEmailAndPassword(auth,$('#loginEmail').value.trim(),$('#loginPassword').value);await routeUser(r.user)}catch(err){console.error(err);show('Connexion impossible. Vérifiez votre e-mail et votre mot de passe.')}});
$('#registerForm').addEventListener('submit',async e=>{e.preventDefault();show('Création du compte...',true);try{const name=$('#registerName').value.trim(),r=await createUserWithEmailAndPassword(auth,$('#registerEmail').value.trim(),$('#registerPassword').value);await setDoc(doc(db,'users',r.user.uid),{uid:r.user.uid,name,email:r.user.email,role:'investor',status:'active',balances:{HTG:0,USD:0,EUR:0,CAD:0},createdAt:serverTimestamp()});location.href='investisseur.html'}catch(err){console.error(err);show(err.code==='auth/email-already-in-use'?'Cette adresse e-mail est déjà utilisée.':'Inscription impossible. Vérifiez les informations et les règles Firestore.')}});
onAuthStateChanged(auth,user=>{if(user)routeUser(user)});
