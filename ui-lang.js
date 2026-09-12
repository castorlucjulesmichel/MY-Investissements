import { getLang, t, applyLang } from './i18n.js';

const extra = {
  fr:{modify:'Modifier',block:'Bloquer',activate:'Activer',approve:'Approuver',reject:'Rejeter',netValidated:'net validé',noLevel:'Aucun niveau.',noPending:'Aucune demande en attente.',noMessage:'Aucun message.',messagingNotOpen:'Messagerie non ouverte.',service:'Service MY',me:'Moi'},
  ht:{modify:'Modifye',block:'Bloke',activate:'Aktive',approve:'Apwouve',reject:'Rejte',netValidated:'nèt valide',noLevel:'Pa gen nivo.',noPending:'Pa gen demann an atant.',noMessage:'Pa gen mesaj.',messagingNotOpen:'Mesajri a poko louvri.',service:'Sèvis MY',me:'Mwen'},
  en:{modify:'Edit',block:'Block',activate:'Activate',approve:'Approve',reject:'Reject',netValidated:'validated net',noLevel:'No level.',noPending:'No pending request.',noMessage:'No message.',messagingNotOpen:'Messaging is not open.',service:'MY Service',me:'Me'},
  es:{modify:'Editar',block:'Bloquear',activate:'Activar',approve:'Aprobar',reject:'Rechazar',netValidated:'neto validado',noLevel:'Ningún nivel.',noPending:'No hay solicitudes pendientes.',noMessage:'No hay mensajes.',messagingNotOpen:'La mensajería no está abierta.',service:'Servicio MY',me:'Yo'}
};

const assistantMap = {
  "Pour un dépôt, ouvrez Portefeuille > Dépôt, indiquez le montant, la devise, la méthode et la référence. L’opération est vérifiée avant crédit du solde.":{
    ht:"Pou yon depo, ouvri Pòtfèy > Depo, mete montan, deviz, metòd ak referans lan. Yo verifye operasyon an anvan yo kredite balans lan.",
    en:"For a deposit, open Wallet > Deposit and enter the amount, currency, method and reference. The operation is verified before your balance is credited.",
    es:"Para un depósito, abra Cartera > Depósito e indique el monto, la moneda, el método y la referencia. La operación se verifica antes de acreditar el saldo."
  },
  "Pour un retrait, soumettez le montant, la devise, la méthode et le compte destinataire. Le paiement est confirmé par une référence après traitement.":{
    ht:"Pou yon retrè, soumèt montan, deviz, metòd ak kont destinasyon an. Apre tretman, yo konfime peman an ak yon referans.",
    en:"For a withdrawal, submit the amount, currency, method and destination account. The payment is confirmed with a reference after processing.",
    es:"Para un retiro, envíe el monto, la moneda, el método y la cuenta de destino. El pago se confirma con una referencia después del procesamiento."
  },
  "Pour un échange, choisissez la devise source, la devise cible et le montant. Le taux doit être validé avant exécution; l’assistant ne déplace pas d’argent lui-même.":{
    ht:"Pou yon echanj, chwazi deviz depa a, deviz destinasyon an ak montan an. Yo dwe valide to a anvan egzekisyon; asistan an pa deplase lajan li menm.",
    en:"For an exchange, choose the source currency, target currency and amount. The rate must be validated before execution; the assistant does not move money itself.",
    es:"Para un cambio, elija la moneda de origen, la moneda de destino y el monto. La tasa debe validarse antes de la ejecución; el asistente no mueve dinero por sí mismo."
  },
  "Les niveaux sont configurés par le Service MY. Vous pouvez soumettre une demande depuis la section Niveaux.":{
    ht:"Sèvis MY konfigire nivo yo. Ou ka soumèt yon demann nan seksyon Nivo yo.",
    en:"Levels are configured by MY Service. You can submit a request from the Levels section.",
    es:"Los niveles son configurados por el Servicio MY. Puede enviar una solicitud desde la sección Niveles."
  },
  "Les rendements affichés sont des estimations basées sur le taux du niveau; ils ne constituent pas une garantie de profit.":{
    ht:"Retou ki parèt yo se estimasyon ki baze sou to nivo a; yo pa yon garanti pwofi.",
    en:"Displayed returns are estimates based on the level rate; they are not a guarantee of profit.",
    es:"Los rendimientos mostrados son estimaciones basadas en la tasa del nivel; no garantizan ganancias."
  },
  "La messagerie privée n’apparaît que si le Service MY choisit d’ouvrir une conversation avec votre compte. Aucune information personnelle de l’administrateur n’est communiquée.":{
    ht:"Mesajri prive a parèt sèlman si Sèvis MY chwazi ouvri yon konvèsasyon ak kont ou. Yo pa bay okenn enfòmasyon pèsonèl admin lan.",
    en:"Private messaging appears only if MY Service chooses to open a conversation with your account. No personal administrator information is disclosed.",
    es:"La mensajería privada aparece solo si el Servicio MY decide abrir una conversación con su cuenta. No se divulga información personal del administrador."
  }
};

function x(key){return extra[getLang()]?.[key]||extra.fr[key]||key;}
function setText(sel,key){const el=document.querySelector(sel);if(el)el.textContent=t(key);}

function translateExact(el){
  if(!el || el.children.length) return;
  const raw=(el.textContent||'').trim();
  if(!raw) return;
  const lang=getLang();
  const exact=[
    ['Actif','active'],['Inactif','inactive'],['En attente','pending'],['Approuvé','approved'],['Rejeté','rejected'],['Payé','paid'],
    ['Dépôt','deposit'],['Retrait','withdraw'],['Échange','exchange'],['Investissement','invest'],['Hebdomadaire','weekly'],['Annuel','annual'],
    ['Investir','invest'],['Aucune donnée','noData'],['Chargement...','loading'],['Sélectionnez un investisseur.','selectInvestor'],['Aucun investisseur','noInvestor']
  ];
  for(const [fr,key] of exact){if(raw===fr){el.textContent=t(key);return}}
  const e=extra.fr;
  const extras=[['Modifier','modify'],['Bloquer','block'],['Activer','activate'],['Approuver','approve'],['Rejeter','reject'],['Aucun niveau.','noLevel'],['Aucune demande en attente.','noPending'],['Aucun message.','noMessage'],['Messagerie non ouverte.','messagingNotOpen'],['Service MY','service'],['Moi','me']];
  for(const [fr,key] of extras){if(raw===fr){el.textContent=x(key);return}}
  if(/^Taux:\s*/.test(raw))el.textContent=`${t('rate')}: ${raw.replace(/^Taux:\s*/,'')}`;
  if(/^Dépôt\s·/.test(raw))el.textContent=raw.replace(/^Dépôt/,t('deposit'));
  if(/^Retrait\s·/.test(raw))el.textContent=raw.replace(/^Retrait/,t('withdraw'));
  if(/^Investissement\s·/.test(raw))el.textContent=raw.replace(/^Investissement/,t('invest'));
  if(/^Échange\s·/.test(raw))el.textContent=raw.replace(/^Échange/,t('exchange'));
  if(/— net validé/.test(raw))el.textContent=raw.replace('net validé',x('netValidated'));
  if(assistantMap[raw] && lang!=='fr')el.textContent=assistantMap[raw][lang]||raw;
}

function translateDynamic(){
  applyLang();
  document.querySelectorAll('button,span,p,h1,h2,h3,th,td,div,option,strong,small').forEach(translateExact);

  const status=document.querySelector('#conversationStatus');
  if(status)status.textContent=status.classList.contains('active')?t('opened'):t('closed');
  const open=document.querySelector('#openConversationBtn');if(open)open.textContent=t('openMessaging');
  const close=document.querySelector('#closeConversationBtn');if(close)close.textContent=t('close');

  const msgSection=document.querySelector('#messages');
  if(msgSection){
    const eyebrow=msgSection.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent=t('privateService');
    const h=msgSection.querySelector('h2');if(h)h.textContent=t('privateChatTitle');
    const p=msgSection.querySelector('.page-head .muted');if(p&&document.body.querySelector('#userName'))p.textContent=t('privateChatInfo');
  }
  const messageText=document.querySelector('#messageText');if(messageText)messageText.placeholder=t('replyService');
  const adminMessageText=document.querySelector('#adminMessageText');if(adminMessageText)adminMessageText.placeholder=t('writeMessage');
}

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;translateDynamic()})};
window.addEventListener('my-language-changed',schedule);
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
schedule();
