import { auth, db, ADMIN_UID } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { collection, addDoc, doc, onSnapshot, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { bindLanguageSelector, getLang } from './i18n.js';

bindLanguageSelector();
const $=s=>document.querySelector(s);
const money=(n,c='HTG')=>`${Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:2})} ${c}`;
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2800)};
let user=null, profile=null, levels=[], investments=[], opSets={deposits:[],withdrawals:[],exchangeRequests:[]};

$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('show');
$('#logoutBtn').onclick=async()=>{await signOut(auth);location.href='index.html'};
document.querySelectorAll('.side-nav a').forEach(a=>a.onclick=()=>$('#sidebar').classList.remove('show'));

function stamp(v){return v?.toDate?v.toDate():new Date(0)}
function renderWallet(){
  const b=profile?.balances||{};const currencies=['HTG','USD','EUR','CAD'];
  $('#walletGrid').innerHTML=currencies.map(c=>`<div class="wallet-item"><span>${c}</span><strong>${money(b[c]||0,c)}</strong></div>`).join('');
  renderMetrics();
}
function renderMetrics(){
  const c=$('#currencyView').value;const b=profile?.balances||{};
  const approved=investments.filter(i=>i.status==='approved'&&i.currency===c);
  const invested=approved.reduce((s,i)=>s+Number(i.amount||0),0);
  const estimated=approved.reduce((s,i)=>{
    const amt=Number(i.amount||0),rate=Number(i.rate||0)/100;return s+amt*rate;
  },0);
  $('#metricBalance').textContent=money(b[c]||0,c);
  $('#metricInvested').textContent=money(invested,c);
  $('#metricProfit').textContent=money(estimated,c);
  $('#metricActive').textContent=approved.length;
}
$('#currencyView').onchange=renderMetrics;

function renderLevels(){
  const active=levels.filter(x=>x.active!==false);
  $('#levelsGrid').innerHTML=active.length?active.map(l=>`<article class="level-card"><span class="tag">${escapeHtml(l.name||'Niveau')}</span><h3>${money(l.amount,l.currency||'HTG')}</h3><div class="level-meta"><span>Taux: ${Number(l.rate||0)} %</span><span>Période: ${l.period==='annual'?'Annuel':'Hebdomadaire'}</span></div><button class="btn primary full invest-level" data-id="${l.id}">Investir</button></article>`).join(''):'<div class="empty">Aucun niveau actif.</div>';
  document.querySelectorAll('.invest-level').forEach(b=>b.onclick=()=>requestInvestment(b.dataset.id));
}
async function requestInvestment(id){
  const l=levels.find(x=>x.id===id);if(!l)return;
  if(!confirm(`Soumettre une demande pour ${l.name} — ${money(l.amount,l.currency)} ?`))return;
  try{await addDoc(collection(db,'investments'),{userId:user.uid,userEmail:user.email,levelId:l.id,levelName:l.name,amount:Number(l.amount),currency:l.currency||'HTG',rate:Number(l.rate||0),period:l.period||'weekly',status:'pending',createdAt:serverTimestamp()});toast('Demande d’investissement envoyée à l’administrateur.');}catch(e){console.error(e);toast('Impossible d’envoyer la demande.');}
}

async function submitRequest(kind,data){try{await addDoc(collection(db,kind),{...data,userId:user.uid,userEmail:user.email,userName:profile?.name||user.email,status:'pending',createdAt:serverTimestamp()});toast('Demande envoyée à l’administrateur.');return true}catch(e){console.error(e);toast('Erreur lors de l’envoi.');return false}}
$('#depositForm').onsubmit=async e=>{e.preventDefault();const ok=await submitRequest('deposits',{amount:Number($('#depositAmount').value),currency:$('#depositCurrency').value,method:$('#depositMethod').value,reference:$('#depositReference').value.trim(),proofUrl:$('#depositProof').value.trim()});if(ok)e.target.reset()};
$('#withdrawForm').onsubmit=async e=>{e.preventDefault();const amount=Number($('#withdrawAmount').value),currency=$('#withdrawCurrency').value;if(amount>Number(profile?.balances?.[currency]||0)){toast('Solde insuffisant.');return}const ok=await submitRequest('withdrawals',{amount,currency,method:$('#withdrawMethod').value,destination:$('#withdrawDestination').value.trim()});if(ok)e.target.reset()};
$('#exchangeForm').onsubmit=async e=>{e.preventDefault();const from=$('#exchangeFrom').value,to=$('#exchangeTo').value,amount=Number($('#exchangeAmount').value);if(from===to){toast('Choisissez deux devises différentes.');return}if(amount>Number(profile?.balances?.[from]||0)){toast('Solde insuffisant.');return}const ok=await submitRequest('exchangeRequests',{amount,fromCurrency:from,toCurrency:to});if(ok)e.target.reset()};

function renderOperations(){
  const all=[...investments.map(x=>({...x,_type:'Investissement',currency:x.currency,reference:x.levelName||''})),...opSets.deposits.map(x=>({...x,_type:'Dépôt'})),...opSets.withdrawals.map(x=>({...x,_type:'Retrait'})),...opSets.exchangeRequests.map(x=>({...x,_type:'Échange',currency:`${x.fromCurrency}→${x.toCurrency}`,reference:x.rate?`Taux ${x.rate}`:''}))].sort((a,b)=>stamp(b.createdAt)-stamp(a.createdAt));
  $('#operationsBody').innerHTML=all.length?all.map(x=>`<tr><td>${stamp(x.createdAt).getTime()?stamp(x.createdAt).toLocaleDateString('fr-FR'):'—'}</td><td>${x._type}</td><td>${Number(x.amount||0).toLocaleString('fr-FR')}</td><td>${escapeHtml(x.currency||'')}</td><td><span class="status ${statusClass(x.status)}">${statusLabel(x.status)}</span></td><td>${escapeHtml(x.reference||x.adminReference||'—')}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Aucune donnée</td></tr>';
  renderMetrics();
}
function statusClass(s){return s==='approved'?'approved':s==='rejected'?'rejected':s==='paid'?'paid':s==='active'?'active':'pending'}
function statusLabel(s){return ({pending:'En attente',approved:'Approuvé',rejected:'Rejeté',paid:'Payé',active:'Actif'}[s]||s||'En attente')}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function watchCollection(name,cb){return onSnapshot(query(collection(db,name),where('userId','==',user.uid)),snap=>cb(snap.docs.map(d=>({id:d.id,...d.data()}))),e=>console.error(name,e))}
function watchMessages(){onSnapshot(query(collection(db,'messages'),where('userId','==',user.uid)),snap=>{const arr=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>stamp(a.createdAt)-stamp(b.createdAt));$('#messageList').innerHTML=arr.length?arr.map(m=>`<div class="chat-bubble ${m.senderRole==='admin'?'admin':'investor'}"><strong>${m.senderRole==='admin'?'Admin':'Moi'}</strong><div>${escapeHtml(m.text)}</div><small>${stamp(m.createdAt).getTime()?stamp(m.createdAt).toLocaleString('fr-FR'):''}</small></div>`).join(''):'<div class="empty">Aucun message.</div>';$('#messageList').scrollTop=$('#messageList').scrollHeight;});}
$('#messageForm').onsubmit=async e=>{e.preventDefault();const text=$('#messageText').value.trim();if(!text)return;await addDoc(collection(db,'messages'),{userId:user.uid,senderId:user.uid,senderRole:'investor',text,createdAt:serverTimestamp()});e.target.reset()};

const assistantAnswers={
  deposit:"Pour un dépôt, ouvrez Portefeuille > Dépôt, indiquez le montant, la devise, la méthode et la référence. L’administrateur vérifie ensuite la transaction avant de créditer votre solde.",
  withdraw:"Pour un retrait, soumettez le montant, la devise, la méthode et le compte destinataire. L’administrateur effectue le paiement et confirme la référence.",
  exchange:"Pour un échange, choisissez la devise source, la devise cible et le montant. Le taux doit être validé avant exécution; l’assistant ne déplace pas d’argent lui-même.",
  level:"Les niveaux sont créés et modifiés uniquement par l’administrateur. Vous pouvez soumettre une demande depuis la section Niveaux.",
  profit:"Les rendements affichés sont des estimations basées sur le taux du niveau; ils ne constituent pas une garantie de profit.",
  admin:"Pour une question spécifique à votre compte, utilisez la section Messages afin de parler directement avec l’administrateur."
};
function answerAssistant(q){const x=q.toLowerCase();if(/depot|dépôt|deposit|depo/.test(x))return assistantAnswers.deposit;if(/retrait|withdraw|retiro|retrè/.test(x))return assistantAnswers.withdraw;if(/change|exchange|echanj|cambio|devise/.test(x))return assistantAnswers.exchange;if(/niveau|level|nivo|nivel/.test(x))return assistantAnswers.level;if(/profit|rendement|return|pwofi|beneficio/.test(x))return assistantAnswers.profit;if(/admin|message|contact/.test(x))return assistantAnswers.admin;return "Je peux vous aider sur les dépôts, retraits, échanges, niveaux et messages avec l’administrateur. Pour une opération spécifique, contactez l’administrateur dans la section Messages."}
$('#assistantForm').onsubmit=e=>{e.preventDefault();const q=$('#assistantInput').value.trim();if(!q)return;const list=$('#assistantList');list.insertAdjacentHTML('beforeend',`<div class="chat-bubble investor">${escapeHtml(q)}</div><div class="chat-bubble assistant">${escapeHtml(answerAssistant(q))}</div>`);e.target.reset();list.scrollTop=list.scrollHeight};

onAuthStateChanged(auth,u=>{
  if(!u){location.href='index.html';return}if(u.uid===ADMIN_UID){location.href='admin.html';return}user=u;
  onSnapshot(doc(db,'users',u.uid),snap=>{if(!snap.exists()){toast('Profil introuvable.');return}profile=snap.data();$('#userName').textContent=profile.name||u.email;$('#welcomeName').textContent=profile.name||'Mon espace';$('#accountStatus').textContent=profile.status==='blocked'?'Bloqué':'Actif';$('#accountStatus').className=`status ${profile.status==='blocked'?'rejected':'active'}`;renderWallet()});
  onSnapshot(collection(db,'levels'),snap=>{levels=snap.docs.map(d=>({id:d.id,...d.data()}));renderLevels()});
  watchCollection('investments',x=>{investments=x;renderOperations()});
  watchCollection('deposits',x=>{opSets.deposits=x;renderOperations()});
  watchCollection('withdrawals',x=>{opSets.withdrawals=x;renderOperations()});
  watchCollection('exchangeRequests',x=>{opSets.exchangeRequests=x;renderOperations()});
  watchMessages();
});
