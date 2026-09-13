import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { collection, doc, getDoc, onSnapshot, query, where, addDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const $=s=>document.querySelector(s);
const toast=text=>{const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(window.__chatToast);window.__chatToast=setTimeout(()=>el.classList.remove('show'),2600)};
const stamp=v=>v?.toDate?v.toDate():new Date(0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let users=[];
let currentUid='';
let conversationOpen=false;
let unsubMessages=null;
let unsubConversation=null;

const words={
  ht:{title:'Mesaj prive',intro:'Admin lan chwazi envestisè li vle pale avè l. Envestisè a sèlman wè “Sèvis MY”, li pa wè idantite admin lan.',investor:'Chwazi envestisè',closed:'Fèmen',opened:'Louvri',open:'Louvri mesajri',close:'Fèmen',choose:'Chwazi yon envestisè.',loading:'Chajman...',write:'Ekri yon mesaj...',send:'Voye',privacy:'Envestisè yo pa resevwa non, imel, UID oswa lòt enfòmasyon pèsonèl admin lan.',openedToast:'Mesajri a louvri pou envestisè sa a.',closedToast:'Mesajri a fèmen.',chooseToast:'Chwazi yon envestisè anvan.',sendError:'Mesaj la pa t voye.',permission:'Ou pa gen aksè admin.'},
  fr:{title:'Messagerie privée',intro:'L’administrateur choisit les investisseurs avec qui il souhaite parler. L’investisseur voit uniquement « Service MY » et jamais l’identité de l’administrateur.',investor:'Choisir un investisseur',closed:'Fermée',opened:'Ouverte',open:'Ouvrir la messagerie',close:'Fermer',choose:'Sélectionnez un investisseur.',loading:'Chargement...',write:'Écrivez un message...',send:'Envoyer',privacy:'Les investisseurs ne reçoivent ni le nom, ni l’e-mail, ni l’UID, ni aucune information personnelle de l’administrateur.',openedToast:'Messagerie ouverte pour cet investisseur.',closedToast:'Messagerie fermée.',chooseToast:'Choisissez un investisseur.',sendError:'Message non envoyé.',permission:'Accès administrateur refusé.'},
  en:{title:'Private messaging',intro:'The admin chooses which investors to speak with. Investors only see “MY Service” and never the admin identity.',investor:'Choose investor',closed:'Closed',opened:'Open',open:'Open messaging',close:'Close',choose:'Select an investor.',loading:'Loading...',write:'Write a message...',send:'Send',privacy:'Investors do not receive the admin name, email, UID, or any other personal information.',openedToast:'Messaging opened for this investor.',closedToast:'Messaging closed.',chooseToast:'Choose an investor first.',sendError:'Message not sent.',permission:'Admin access denied.'},
  es:{title:'Mensajería privada',intro:'El administrador elige con qué inversores desea hablar. El inversor solo ve «Servicio MY» y nunca la identidad del administrador.',investor:'Elegir inversor',closed:'Cerrada',opened:'Abierta',open:'Abrir mensajería',close:'Cerrar',choose:'Seleccione un inversor.',loading:'Cargando...',write:'Escriba un mensaje...',send:'Enviar',privacy:'Los inversores no reciben el nombre, correo, UID ni ninguna información personal del administrador.',openedToast:'Mensajería abierta para este inversor.',closedToast:'Mensajería cerrada.',chooseToast:'Seleccione un inversor primero.',sendError:'Mensaje no enviado.',permission:'Acceso de administrador denegado.'}
};

function lang(){return localStorage.getItem('my_lang')||'ht'}
function t(k){return words[lang()]?.[k]||words.ht[k]||k}
function applyLang(){
  document.documentElement.lang=lang();
  $('#langSelect').value=lang();
  $('#pageTitle').textContent=t('title');
  $('#heading').textContent=t('title');
  $('#intro').textContent=t('intro');
  $('#investorLabel').textContent=t('investor');
  $('#openConversationBtn').textContent=t('open');
  $('#closeConversationBtn').textContent=t('close');
  $('#messageText').placeholder=t('write');
  $('#sendBtn').textContent=t('send');
  $('#privacyText').textContent=t('privacy');
  renderStatus();
  if(!currentUid) $('#messageList').innerHTML=`<div class="empty">${esc(t('choose'))}</div>`;
}

function renderStatus(){
  const s=$('#conversationStatus');
  s.textContent=conversationOpen?t('opened'):t('closed');
  s.className=`status ${conversationOpen?'open':''}`;
  $('#openConversationBtn').disabled=!currentUid||conversationOpen;
  $('#closeConversationBtn').disabled=!currentUid||!conversationOpen;
  $('#messageText').disabled=!conversationOpen;
  $('#sendBtn').disabled=!conversationOpen;
}

function populateUsers(){
  const select=$('#chatUserSelect');
  const previous=select.value;
  const list=users.filter(u=>u.role!=='admin');
  select.innerHTML=list.length?list.map(u=>`<option value="${u.uid}">${esc(u.name||u.email||'Investisseur')} — ${esc(u.email||'')}</option>`).join(''):`<option value="">${esc(t('choose'))}</option>`;
  if(previous&&list.some(u=>u.uid===previous))select.value=previous;
  if(!currentUid&&list.length){select.value=list[0].uid;select.dispatchEvent(new Event('change'));}
}

function stopWatchers(){if(unsubMessages){unsubMessages();unsubMessages=null}if(unsubConversation){unsubConversation();unsubConversation=null}}

function watchSelected(uid){
  stopWatchers();
  currentUid=uid||'';
  conversationOpen=false;
  renderStatus();
  if(!currentUid){$('#messageList').innerHTML=`<div class="empty">${esc(t('choose'))}</div>`;return}

  unsubConversation=onSnapshot(doc(db,'conversations',currentUid),snap=>{
    conversationOpen=snap.exists()&&snap.data().enabled===true;
    renderStatus();
  },e=>{console.error('conversation',e);conversationOpen=false;renderStatus()});

  unsubMessages=onSnapshot(query(collection(db,'messages'),where('userId','==',currentUid)),snap=>{
    const arr=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>stamp(a.createdAt)-stamp(b.createdAt));
    const box=$('#messageList');
    box.innerHTML=arr.length?arr.map(m=>`<div class="bubble ${m.senderRole==='investor'?'investor':'service'}"><strong>${m.senderRole==='investor'?esc(users.find(u=>u.uid===currentUid)?.name||'Investisseur'):'Service MY'}</strong><div>${esc(m.text||'')}</div><small>${stamp(m.createdAt).getTime()?stamp(m.createdAt).toLocaleString():''}</small></div>`).join(''):`<div class="empty">${esc(t('choose'))}</div>`;
    box.scrollTop=box.scrollHeight;
  },e=>{console.error('messages',e);$('#messageList').innerHTML=`<div class="empty">${esc(t('sendError'))}</div>`});
}

$('#langSelect').addEventListener('change',e=>{localStorage.setItem('my_lang',e.target.value);applyLang();populateUsers()});
$('#chatUserSelect').addEventListener('change',e=>watchSelected(e.target.value));
$('#openConversationBtn').addEventListener('click',async()=>{
  if(!currentUid){toast(t('chooseToast'));return}
  try{await setDoc(doc(db,'conversations',currentUid),{userId:currentUid,enabled:true,openedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});toast(t('openedToast'))}catch(e){console.error(e);toast(t('permission'))}
});
$('#closeConversationBtn').addEventListener('click',async()=>{
  if(!currentUid)return;
  try{await setDoc(doc(db,'conversations',currentUid),{userId:currentUid,enabled:false,closedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});toast(t('closedToast'))}catch(e){console.error(e);toast(t('permission'))}
});
$('#messageForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const text=$('#messageText').value.trim();
  if(!currentUid||!conversationOpen||!text)return;
  try{await addDoc(collection(db,'messages'),{userId:currentUid,senderRole:'service',text,createdAt:serverTimestamp()});e.target.reset()}catch(err){console.error(err);toast(t('sendError'))}
});

applyLang();
onAuthStateChanged(auth,async user=>{
  if(!user){location.href='index.html';return}
  try{
    const admin=await getDoc(doc(db,'admins',user.uid));
    if(!admin.exists()||admin.data().active===false){toast(t('permission'));setTimeout(()=>location.href='investisseur.html',700);return}
    onSnapshot(collection(db,'users'),snap=>{users=snap.docs.map(d=>({uid:d.id,...d.data()}));populateUsers()},e=>{console.error(e);toast(t('permission'))});
  }catch(e){console.error(e);location.href='index.html'}
});
