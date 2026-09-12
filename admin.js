import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { collection, doc, addDoc, setDoc, updateDoc, onSnapshot, query, where, serverTimestamp, runTransaction, getDoc } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { bindLanguageSelector } from './i18n.js';

bindLanguageSelector();
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=(n,c='HTG')=>`${Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:2})} ${c}`;
const stamp=v=>v?.toDate?v.toDate():new Date(0);
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2800)};
let users=[],levels=[],deposits=[],withdrawals=[],investments=[],exchanges=[],conversations=[];
let chatUnsub=null,currentChatUid='';

$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('show');
$('#logoutBtn').onclick=async()=>{await signOut(auth);location.href='index.html'};
document.querySelectorAll('.side-nav a').forEach(a=>a.onclick=()=>$('#sidebar').classList.remove('show'));

function renderAll(){renderMetrics();renderUsers();renderLevels();renderRequests();renderSelectors();renderFlows();renderRecent();renderConversationState()}
function renderMetrics(){
  $('#metricUsers').textContent=users.filter(u=>u.role!=='admin').length;
  $('#metricLevels').textContent=levels.filter(l=>l.active!==false).length;
  $('#metricPending').textContent=[...deposits,...withdrawals,...investments,...exchanges].filter(x=>x.status==='pending').length;
  $('#metricInvestments').textContent=investments.filter(x=>x.status==='approved').length;
}
function renderFlows(){
  const cs=['HTG','USD','EUR','CAD'];
  $('#flowStats').innerHTML=cs.map(c=>{const dep=deposits.filter(x=>x.status==='approved'&&x.currency===c).reduce((s,x)=>s+Number(x.amount||0),0);const wd=withdrawals.filter(x=>x.status==='paid'&&x.currency===c).reduce((s,x)=>s+Number(x.amount||0),0);return `<div class="wallet-item"><span>${c} — net validé</span><strong>${money(dep-wd,c)}</strong><small>+${money(dep,c)} / -${money(wd,c)}</small></div>`}).join('');
}
function renderRecent(){
  const all=[...deposits.map(x=>({...x,_type:'Dépôt'})),...withdrawals.map(x=>({...x,_type:'Retrait'})),...investments.map(x=>({...x,_type:'Investissement'})),...exchanges.map(x=>({...x,_type:'Échange'}))].sort((a,b)=>stamp(b.createdAt)-stamp(a.createdAt)).slice(0,6);
  $('#recentActivity').innerHTML=all.length?all.map(x=>`<div class="request-card"><div><strong>${esc(x.userName||x.userEmail||x.userId)}</strong><p>${x._type} · ${Number(x.amount||0).toLocaleString('fr-FR')} ${esc(x.currency||x.fromCurrency||'')}</p></div><span class="status ${statusClass(x.status)}">${statusLabel(x.status)}</span></div>`).join(''):'<div class="empty">Aucune donnée</div>';
}
function renderUsers(){
  const list=users.filter(u=>u.role!=='admin');
  $('#investorsBody').innerHTML=list.length?list.map(u=>`<tr><td>${esc(u.name||'—')}</td><td>${esc(u.email||'—')}</td><td>${money(u.balances?.HTG||0,'HTG')}</td><td>${money(u.balances?.USD||0,'USD')}</td><td>${money(u.balances?.EUR||0,'EUR')}</td><td>${money(u.balances?.CAD||0,'CAD')}</td><td><span class="status ${u.status==='blocked'?'rejected':'active'}">${u.status==='blocked'?'Bloqué':'Actif'}</span></td><td><button class="btn ${u.status==='blocked'?'success':'danger'} small toggle-user" data-id="${u.uid}" data-status="${u.status||'active'}">${u.status==='blocked'?'Activer':'Bloquer'}</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">Aucun investisseur</td></tr>';
  document.querySelectorAll('.toggle-user').forEach(b=>b.onclick=async()=>{try{await updateDoc(doc(db,'users',b.dataset.id),{status:b.dataset.status==='blocked'?'active':'blocked',updatedAt:serverTimestamp()});toast('Statut mis à jour.')}catch(e){console.error(e);toast('Erreur de mise à jour.')}});
}
function renderSelectors(){
  const list=users.filter(u=>u.role!=='admin');
  const opts=list.map(u=>`<option value="${u.uid}">${esc(u.name||u.email)} — ${esc(u.email||'')}</option>`).join('');
  const oldManual=$('#manualUser').value, oldChat=$('#chatUserSelect').value;
  $('#manualUser').innerHTML=opts||'<option value="">Aucun investisseur</option>';
  $('#chatUserSelect').innerHTML=opts||'<option value="">Aucun investisseur</option>';
  if([...$('#manualUser').options].some(o=>o.value===oldManual))$('#manualUser').value=oldManual;
  if([...$('#chatUserSelect').options].some(o=>o.value===oldChat))$('#chatUserSelect').value=oldChat;
  const uid=$('#chatUserSelect').value||'';
  if(uid!==currentChatUid)watchChat(uid);else renderConversationState();
}
function renderLevels(){
  $('#adminLevels').innerHTML=levels.length?levels.map(l=>`<article class="level-card"><span class="tag">${esc(l.name)}</span><h3>${money(l.amount,l.currency)}</h3><div class="level-meta"><span>Taux: ${Number(l.rate||0)} %</span><span>${l.period==='annual'?'Annuel':'Hebdomadaire'}</span><span class="status ${l.active===false?'rejected':'active'}">${l.active===false?'Inactif':'Actif'}</span></div><button class="btn ghost full edit-level" data-id="${l.id}">Modifier</button></article>`).join(''):'<div class="empty">Aucun niveau.</div>';
  document.querySelectorAll('.edit-level').forEach(b=>b.onclick=()=>{const l=levels.find(x=>x.id===b.dataset.id);if(!l)return;$('#levelId').value=l.id;$('#levelName').value=l.name||'';$('#levelAmount').value=l.amount||'';$('#levelCurrency').value=l.currency||'HTG';$('#levelRate').value=l.rate||0;$('#levelPeriod').value=l.period||'weekly';$('#levelActive').value=String(l.active!==false);location.hash='levels'});
}
$('#cancelLevelEdit').onclick=()=>{$('#levelForm').reset();$('#levelId').value=''};
$('#levelForm').onsubmit=async e=>{e.preventDefault();const data={name:$('#levelName').value.trim(),amount:Number($('#levelAmount').value),currency:$('#levelCurrency').value,rate:Number($('#levelRate').value),period:$('#levelPeriod').value,active:$('#levelActive').value==='true',updatedAt:serverTimestamp()};try{const id=$('#levelId').value;if(id)await updateDoc(doc(db,'levels',id),data);else await addDoc(collection(db,'levels'),{...data,createdAt:serverTimestamp()});e.target.reset();$('#levelId').value='';toast('Niveau enregistré.')}catch(err){console.error(err);toast('Impossible d’enregistrer le niveau.')}};

function pendingRequests(){return [...deposits.filter(x=>x.status==='pending').map(x=>({...x,_kind:'deposit',_label:'Dépôt'})),...withdrawals.filter(x=>x.status==='pending').map(x=>({...x,_kind:'withdrawal',_label:'Retrait'})),...investments.filter(x=>x.status==='pending').map(x=>({...x,_kind:'investment',_label:'Investissement'})),...exchanges.filter(x=>x.status==='pending').map(x=>({...x,_kind:'exchange',_label:'Échange'}))].sort((a,b)=>stamp(b.createdAt)-stamp(a.createdAt))}
function renderRequests(){
  const f=$('#requestFilter').value;let arr=pendingRequests();if(f!=='all')arr=arr.filter(x=>x._kind===f);
  $('#requestsList').innerHTML=arr.length?arr.map(x=>`<div class="request-card"><div><strong>${esc(x.userName||x.userEmail||x.userId)}</strong><p>${x._label} · ${Number(x.amount||0).toLocaleString('fr-FR')} ${esc(x.currency||x.fromCurrency||'')}${x.toCurrency?' → '+esc(x.toCurrency):''}</p><p class="small">${esc(x.method||x.levelName||x.reference||'')}</p></div><div class="admin-actions"><button class="btn success approve-request" data-kind="${x._kind}" data-id="${x.id}">Approuver</button><button class="btn danger reject-request" data-kind="${x._kind}" data-id="${x.id}">Rejeter</button></div></div>`).join(''):'<div class="empty">Aucune demande en attente.</div>';
  document.querySelectorAll('.approve-request').forEach(b=>b.onclick=()=>approveRequest(b.dataset.kind,b.dataset.id));
  document.querySelectorAll('.reject-request').forEach(b=>b.onclick=()=>rejectRequest(b.dataset.kind,b.dataset.id));
}
$('#requestFilter').onchange=renderRequests;
function getArr(kind){return kind==='deposit'?deposits:kind==='withdrawal'?withdrawals:kind==='investment'?investments:exchanges}
function getCollection(kind){return kind==='deposit'?'deposits':kind==='withdrawal'?'withdrawals':kind==='investment'?'investments':'exchangeRequests'}
async function rejectRequest(kind,id){if(!confirm('Rejeter cette demande ?'))return;try{await updateDoc(doc(db,getCollection(kind),id),{status:'rejected',processedAt:serverTimestamp()});toast('Demande rejetée.')}catch(e){console.error(e);toast('Erreur.')}}
async function approveRequest(kind,id){
  const req=getArr(kind).find(x=>x.id===id);if(!req)return;let reference='',rate=null;
  if(kind==='deposit'||kind==='withdrawal'){reference=prompt('Référence de confirmation de l’opération réelle :',req.reference||'')||'';if(!reference){toast('Référence requise.');return}}
  if(kind==='exchange'){rate=Number(prompt(`Taux réel ${req.fromCurrency} → ${req.toCurrency} :`,'')||0);if(!(rate>0)){toast('Taux invalide.');return}reference=prompt('Référence de l’échange réel :','')||'';if(!reference){toast('Référence requise.');return}}
  try{await runTransaction(db,async tx=>{const reqRef=doc(db,getCollection(kind),id),userRef=doc(db,'users',req.userId);const [reqSnap,userSnap]=await Promise.all([tx.get(reqRef),tx.get(userRef)]);if(!reqSnap.exists()||!userSnap.exists())throw new Error('Document introuvable');if(reqSnap.data().status!=='pending')throw new Error('Déjà traité');const balances={...(userSnap.data().balances||{})};
    if(kind==='deposit'){const c=req.currency;balances[c]=Number(balances[c]||0)+Number(req.amount);tx.update(reqRef,{status:'approved',adminReference:reference,processedAt:serverTimestamp()});}
    if(kind==='withdrawal'){const c=req.currency;if(Number(balances[c]||0)<Number(req.amount))throw new Error('Solde insuffisant');balances[c]=Number(balances[c]||0)-Number(req.amount);tx.update(reqRef,{status:'paid',adminReference:reference,processedAt:serverTimestamp()});}
    if(kind==='investment'){const c=req.currency;if(Number(balances[c]||0)<Number(req.amount))throw new Error('Solde insuffisant');balances[c]=Number(balances[c]||0)-Number(req.amount);tx.update(reqRef,{status:'approved',approvedAt:serverTimestamp()});}
    if(kind==='exchange'){const from=req.fromCurrency,to=req.toCurrency;if(Number(balances[from]||0)<Number(req.amount))throw new Error('Solde insuffisant');const converted=Number(req.amount)*rate;balances[from]=Number(balances[from]||0)-Number(req.amount);balances[to]=Number(balances[to]||0)+converted;tx.update(reqRef,{status:'approved',rate,convertedAmount:converted,adminReference:reference,processedAt:serverTimestamp()});}
    tx.update(userRef,{balances,updatedAt:serverTimestamp()});});toast('Opération validée.');}catch(e){console.error(e);toast(e.message||'Validation impossible.');}
}
$('#manualOperationForm').onsubmit=async e=>{e.preventDefault();const uid=$('#manualUser').value,type=$('#manualType').value,amount=Number($('#manualAmount').value),currency=$('#manualCurrency').value,method=$('#manualMethod').value,reference=$('#manualReference').value.trim();if(!uid||!(amount>0)||!reference)return;try{await runTransaction(db,async tx=>{const userRef=doc(db,'users',uid),snap=await tx.get(userRef);if(!snap.exists())throw new Error('Investisseur introuvable');const balances={...(snap.data().balances||{})};if(type==='withdrawal'&&Number(balances[currency]||0)<amount)throw new Error('Solde insuffisant');balances[currency]=Number(balances[currency]||0)+(type==='deposit'?amount:-amount);tx.update(userRef,{balances,updatedAt:serverTimestamp()});const col=type==='deposit'?'deposits':'withdrawals';const opRef=doc(collection(db,col));tx.set(opRef,{userId:uid,userEmail:snap.data().email,userName:snap.data().name,amount,currency,method,reference,adminReference:reference,status:type==='deposit'?'approved':'paid',source:'admin-manual',createdAt:serverTimestamp(),processedAt:serverTimestamp()});});e.target.reset();toast('Opération manuelle enregistrée.');}catch(err){console.error(err);toast(err.message||'Opération impossible.')}};

function ensureChatControls(){
  const section=$('#messages');if(!section||$('#conversationControls'))return;
  const head=section.querySelector('.page-head');const box=document.createElement('div');box.id='conversationControls';box.className='conversation-controls';box.innerHTML='<span id="conversationStatus" class="status pending">Fermée</span><button id="openConversationBtn" class="btn success" type="button">Ouvrir la messagerie</button><button id="closeConversationBtn" class="btn danger" type="button">Fermer</button>';
  head.appendChild(box);section.querySelector('h2').textContent='Messagerie privée';section.querySelector('.muted').textContent='Vous choisissez les investisseurs autorisés à échanger avec le Service MY. Votre identité personnelle n’est jamais affichée aux investisseurs.';
  $('#openConversationBtn').onclick=openSelectedConversation;$('#closeConversationBtn').onclick=closeSelectedConversation;
}
function conversationFor(uid){return conversations.find(c=>c.id===uid||c.userId===uid)}
function renderConversationState(){
  ensureChatControls();const uid=$('#chatUserSelect')?.value||'';const open=!!uid&&conversationFor(uid)?.enabled===true;
  if($('#conversationStatus')){$('#conversationStatus').textContent=open?'Ouverte':'Fermée';$('#conversationStatus').className=`status ${open?'active':'pending'}`}
  if($('#openConversationBtn'))$('#openConversationBtn').disabled=!uid||open;
  if($('#closeConversationBtn'))$('#closeConversationBtn').disabled=!uid||!open;
  if($('#adminMessageForm'))$('#adminMessageForm').classList.toggle('hidden',!open);
}
async function openSelectedConversation(){const uid=$('#chatUserSelect').value;if(!uid){toast('Choisissez un investisseur.');return}try{await setDoc(doc(db,'conversations',uid),{userId:uid,enabled:true,openedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});toast('Messagerie ouverte pour cet investisseur.')}catch(e){console.error(e);toast('Impossible d’ouvrir la messagerie.')}}
async function closeSelectedConversation(){const uid=$('#chatUserSelect').value;if(!uid)return;try{await setDoc(doc(db,'conversations',uid),{userId:uid,enabled:false,closedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});toast('Messagerie fermée.')}catch(e){console.error(e);toast('Impossible de fermer la messagerie.')}}
function watchChat(uid){
  currentChatUid=uid;if(chatUnsub){chatUnsub();chatUnsub=null}
  if(!uid){$('#adminMessageList').innerHTML='<div class="empty">Sélectionnez un investisseur.</div>';renderConversationState();return}
  chatUnsub=onSnapshot(query(collection(db,'messages'),where('userId','==',uid)),snap=>{const arr=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>stamp(a.createdAt)-stamp(b.createdAt));$('#adminMessageList').innerHTML=arr.length?arr.map(m=>`<div class="chat-bubble ${m.senderRole==='investor'?'investor':'admin'}"><strong>${m.senderRole==='investor'?esc(users.find(u=>u.uid===uid)?.name||'Investisseur'):'Service MY'}</strong><div>${esc(m.text)}</div><small>${stamp(m.createdAt).getTime()?stamp(m.createdAt).toLocaleString('fr-FR'):''}</small></div>`).join(''):'<div class="empty">Aucun message.</div>';$('#adminMessageList').scrollTop=$('#adminMessageList').scrollHeight;},e=>console.error('messages',e));renderConversationState();
}
$('#chatUserSelect').onchange=e=>watchChat(e.target.value);
$('#adminMessageForm').onsubmit=async e=>{e.preventDefault();const uid=$('#chatUserSelect').value,text=$('#adminMessageText').value.trim();if(!uid||!text){toast('Choisissez un investisseur.');return}if(conversationFor(uid)?.enabled!==true){toast('Ouvrez d’abord la messagerie pour cet investisseur.');return}try{await addDoc(collection(db,'messages'),{userId:uid,senderRole:'service',text,createdAt:serverTimestamp()});e.target.reset()}catch(err){console.error(err);toast('Message non envoyé.')}};

function statusClass(s){return s==='approved'?'approved':s==='rejected'?'rejected':s==='paid'?'paid':s==='active'?'active':'pending'}
function statusLabel(s){return ({pending:'En attente',approved:'Approuvé',rejected:'Rejeté',paid:'Payé',active:'Actif'}[s]||s||'En attente')}
function watch(name,setter){return onSnapshot(collection(db,name),snap=>{setter(snap.docs.map(d=>({id:d.id,...d.data()})));renderAll()},e=>console.error(name,e))}
function startAdmin(){ensureChatControls();watch('users',x=>users=x);watch('levels',x=>levels=x);watch('deposits',x=>deposits=x);watch('withdrawals',x=>withdrawals=x);watch('investments',x=>investments=x);watch('exchangeRequests',x=>exchanges=x);watch('conversations',x=>conversations=x)}

onAuthStateChanged(auth,async u=>{
  if(!u){location.href='index.html';return}
  try{const adminSnap=await getDoc(doc(db,'admins',u.uid));if(!adminSnap.exists()||adminSnap.data().active===false){location.href='investisseur.html';return}startAdmin()}catch(e){console.error(e);location.href='index.html'}
});
