import './admin-hotfix.js';
import { getLang, t, applyLang } from './i18n.js';

const extra = {
  fr:{modify:'Modifier',block:'Bloquer',activate:'Activer',approve:'Approuver',reject:'Rejeter',netValidated:'net validé',noLevel:'Aucun niveau.',noPending:'Aucune demande en attente.',noMessage:'Aucun message.',messagingNotOpen:'Messagerie non ouverte.',service:'Service MY',me:'Moi'},
  ht:{modify:'Modifye',block:'Bloke',activate:'Aktive',approve:'Apwouve',reject:'Rejte',netValidated:'nèt valide',noLevel:'Pa gen nivo.',noPending:'Pa gen demann an atant.',noMessage:'Pa gen mesaj.',messagingNotOpen:'Mesajri a poko louvri.',service:'Sèvis MY',me:'Mwen'},
  en:{modify:'Edit',block:'Block',activate:'Activate',approve:'Approve',reject:'Reject',netValidated:'validated net',noLevel:'No level.',noPending:'No pending request.',noMessage:'No message.',messagingNotOpen:'Messaging is not open.',service:'MY Service',me:'Me'},
  es:{modify:'Editar',block:'Bloquear',activate:'Activar',approve:'Aprobar',reject:'Rechazar',netValidated:'neto validado',noLevel:'Ningún nivel.',noPending:'No hay solicitudes pendientes.',noMessage:'No hay mensajes.',messagingNotOpen:'La mensajería no está abierta.',service:'Servicio MY',me:'Yo'}
};

const exact = new Map([
  ['Actif',['t','active']],['Inactif',['t','inactive']],['En attente',['t','pending']],['Approuvé',['t','approved']],['Rejeté',['t','rejected']],['Payé',['t','paid']],
  ['Dépôt',['t','deposit']],['Retrait',['t','withdraw']],['Échange',['t','exchange']],['Investissement',['t','invest']],['Hebdomadaire',['t','weekly']],['Annuel',['t','annual']],['Investir',['t','invest']],
  ['Aucune donnée',['t','noData']],['Chargement...',['t','loading']],['Sélectionnez un investisseur.',['t','selectInvestor']],['Aucun investisseur',['t','noInvestor']],
  ['Ouverte',['t','opened']],['Fermée',['t','closed']],['Ouvrir la messagerie',['t','openMessaging']],['Fermer',['t','close']],
  ['Modifier',['x','modify']],['Bloquer',['x','block']],['Activer',['x','activate']],['Approuver',['x','approve']],['Rejeter',['x','reject']],['Aucun niveau.',['x','noLevel']],['Aucune demande en attente.',['x','noPending']],['Aucun message.',['x','noMessage']],['Messagerie non ouverte.',['x','messagingNotOpen']],['Service MY',['x','service']],['Moi',['x','me']]
]);

function x(key){return extra[getLang()]?.[key]||extra.fr[key]||key;}
function value(kind,key){return kind==='x'?x(key):t(key);}
function setTextSafe(el,text){if(el && el.textContent!==text)el.textContent=text;}
function setPlaceholderSafe(el,text){if(el && el.placeholder!==text)el.placeholder=text;}

function translateElement(el){
  if(!el || el.nodeType!==1) return;
  if(el.dataset?.i18n || el.dataset?.i18nPlaceholder) return;

  if(el.dataset?.dynKind && el.dataset?.dynKey){
    setTextSafe(el,value(el.dataset.dynKind,el.dataset.dynKey));
    return;
  }

  if(el.children.length) return;
  const raw=(el.textContent||'').trim();
  if(!raw) return;
  const found=exact.get(raw);
  if(found){
    el.dataset.dynKind=found[0];
    el.dataset.dynKey=found[1];
    setTextSafe(el,value(found[0],found[1]));
    return;
  }

  if(/^Taux:\s*/.test(raw)){
    el.dataset.dynamicRate=raw.replace(/^Taux:\s*/,'');
    setTextSafe(el,`${t('rate')}: ${el.dataset.dynamicRate}`);
    return;
  }
  if(/— net validé/.test(raw)){
    el.dataset.dynamicNet=raw.replace('net validé','__NET__');
    setTextSafe(el,el.dataset.dynamicNet.replace('__NET__',x('netValidated')));
  }
}

function translateSubtree(root=document){
  const selector='button,span,p,h1,h2,h3,th,td,div,option,strong,small';
  if(root.nodeType===1 && root.matches?.(selector)) translateElement(root);
  root.querySelectorAll?.(selector).forEach(translateElement);
}

function refreshSpecial(){
  document.querySelectorAll('[data-dyn-kind][data-dyn-key]').forEach(el=>setTextSafe(el,value(el.dataset.dynKind,el.dataset.dynKey)));
  document.querySelectorAll('[data-dynamic-rate]').forEach(el=>setTextSafe(el,`${t('rate')}: ${el.dataset.dynamicRate}`));
  document.querySelectorAll('[data-dynamic-net]').forEach(el=>setTextSafe(el,el.dataset.dynamicNet.replace('__NET__',x('netValidated'))));

  const status=document.querySelector('#conversationStatus');
  if(status) setTextSafe(status,status.classList.contains('active')?t('opened'):t('closed'));
  setTextSafe(document.querySelector('#openConversationBtn'),t('openMessaging'));
  setTextSafe(document.querySelector('#closeConversationBtn'),t('close'));
  setPlaceholderSafe(document.querySelector('#messageText'),t('replyService'));
  setPlaceholderSafe(document.querySelector('#adminMessageText'),t('writeMessage'));
}

function refreshAll(){
  applyLang();
  translateSubtree(document);
  refreshSpecial();
}

window.addEventListener('my-language-changed',()=>requestAnimationFrame(refreshAll));

// Translate only DOM pieces that actually changed. All writes are guarded by
// equality checks so the observer cannot trigger itself in an endless loop.
const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
    if(mutation.target?.nodeType===1) translateElement(mutation.target);
    for(const node of mutation.addedNodes){
      if(node.nodeType===1) translateSubtree(node);
    }
  }
});
observer.observe(document.body,{subtree:true,childList:true});

refreshAll();
