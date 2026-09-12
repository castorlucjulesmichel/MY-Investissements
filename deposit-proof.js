import { auth, db } from './firebase-config.js';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const form=document.querySelector('#depositForm');
if(form){
  const $=s=>form.querySelector(s);
  const method=$('#depositMethod');
  const amount=$('#depositAmount');
  const currency=$('#depositCurrency');
  const reference=$('#depositReference');
  const proof=$('#depositProof');
  const logo=$('#depositPaymentLogo');
  const brand=$('#depositPaymentBrand');
  const receiver=$('#depositReceiverName');
  const number=$('#depositReceiverNumber');
  const numberRow=$('#depositNumberRow');
  const note=$('#depositAccountNote');
  const preview=$('#depositProofPreview');
  const submit=form.querySelector('button[type="submit"]');

  if(proof) proof.removeAttribute('capture');

  const NATCASH={brand:'NatCash',logo:'assets/natcash.svg',name:'Luc Jules Michel Castor',number:'+509 41766115',enabled:true};
  const MONCASH={brand:'MonCash',logo:'assets/moncash.svg',name:'',number:'',enabled:false};
  const configs={NatCash:NATCASH,MonCash:MONCASH};

  const copy={
    fr:{beneficiary:'Bénéficiaire',number:'Numéro',send:'Envoyez le paiement à ce compte puis joignez la photo ou capture de la transaction.',photo:'Photo de la transaction',photoHelp:'Ajoutez une photo ou capture d’écran lisible de la transaction.',natReady:'Compte NatCash disponible pour les dépôts.',monMissing:'MonCash sera activé dès que les informations de réception seront configurées.',badPhoto:'Veuillez sélectionner une image de transaction.',tooLarge:'La photo est trop volumineuse. Choisissez une image plus petite.',sending:'Envoi en cours…',success:'Demande de dépôt envoyée. La photo sera vérifiée avant crédit du solde.',error:'Impossible d’envoyer le dépôt. Réessayez.',monBlocked:'MonCash n’est pas encore configuré pour recevoir ce dépôt.'},
    ht:{beneficiary:'Benefisyè',number:'Nimewo',send:'Voye peman an sou kont sa a epi ajoute foto oswa screenshot tranzaksyon an.',photo:'Foto tranzaksyon an',photoHelp:'Ajoute yon foto oswa screenshot tranzaksyon an ki klè.',natReady:'Kont NatCash la disponib pou depo.',monMissing:'MonCash ap aktive lè enfòmasyon resepsyon yo fin konfigire.',badPhoto:'Tanpri chwazi yon foto tranzaksyon.',tooLarge:'Foto a twò gwo. Chwazi yon imaj ki pi piti.',sending:'Ap voye…',success:'Demann depo a voye. Yo pral verifye foto a anvan yo kredite balans lan.',error:'Depo a pa t kapab voye. Eseye ankò.',monBlocked:'MonCash poko konfigire pou resevwa depo sa a.'},
    en:{beneficiary:'Beneficiary',number:'Number',send:'Send the payment to this account, then attach a photo or screenshot of the transaction.',photo:'Transaction photo',photoHelp:'Attach a clear photo or screenshot of the transaction.',natReady:'The NatCash account is available for deposits.',monMissing:'MonCash will be enabled once receiving details are configured.',badPhoto:'Please select a transaction image.',tooLarge:'The photo is too large. Choose a smaller image.',sending:'Sending…',success:'Deposit request sent. The photo will be verified before the balance is credited.',error:'The deposit could not be sent. Try again.',monBlocked:'MonCash is not yet configured to receive this deposit.'},
    es:{beneficiary:'Beneficiario',number:'Número',send:'Envíe el pago a esta cuenta y luego adjunte una foto o captura de la transacción.',photo:'Foto de la transacción',photoHelp:'Adjunte una foto o captura clara de la transacción.',natReady:'La cuenta NatCash está disponible para depósitos.',monMissing:'MonCash se habilitará cuando se configuren los datos de recepción.',badPhoto:'Seleccione una imagen de la transacción.',tooLarge:'La foto es demasiado grande. Elija una imagen más pequeña.',sending:'Enviando…',success:'Solicitud de depósito enviada. La foto será verificada antes de acreditar el saldo.',error:'No se pudo enviar el depósito. Inténtelo de nuevo.',monBlocked:'MonCash aún no está configurado para recibir este depósito.'}
  };
  const lang=()=>localStorage.getItem('my_lang')||document.documentElement.lang||'fr';
  const tr=k=>copy[lang()]?.[k]||copy.fr[k]||k;
  const notify=text=>{const t=document.querySelector('#toast');if(t){t.textContent=text;t.classList.add('show');clearTimeout(window.__depositToast);window.__depositToast=setTimeout(()=>t.classList.remove('show'),3200)}else alert(text)};

  function refreshAccount(){
    const c=configs[method.value]||NATCASH;
    if(logo){logo.src=c.logo;logo.alt=c.brand;}
    if(brand)brand.textContent=c.brand;
    if(receiver)receiver.textContent=c.name||'—';
    if(number)number.textContent=c.number||'—';
    if(numberRow)numberRow.classList.toggle('hidden',!c.number);
    if(note){note.textContent=c.enabled?tr('natReady'):tr('monMissing');note.className=`payment-account-note ${c.enabled?'ready':'waiting'}`;}
    const benLabel=form.querySelector('[data-deposit-beneficiary]');if(benLabel)benLabel.textContent=tr('beneficiary');
    const numLabel=form.querySelector('[data-deposit-number]');if(numLabel)numLabel.textContent=tr('number');
    const sendText=form.querySelector('[data-deposit-send]');if(sendText)sendText.textContent=tr('send');
    const photoLabel=form.querySelector('[data-deposit-photo-label]');if(photoLabel)photoLabel.textContent=tr('photo');
    const photoHelp=form.querySelector('[data-deposit-photo-help]');if(photoHelp)photoHelp.textContent=tr('photoHelp');
  }

  async function compressImage(file){
    if(!file.type.startsWith('image/'))throw new Error('not-image');
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
      const maxSide=1500,scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
      const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      let q=.82,data=canvas.toDataURL('image/jpeg',q);
      while(data.length>700000&&q>.42){q-=.08;data=canvas.toDataURL('image/jpeg',q);}
      if(data.length>760000)throw new Error('too-large');
      return data;
    }finally{URL.revokeObjectURL(url);}
  }

  method?.addEventListener('change',refreshAccount);
  proof?.addEventListener('change',()=>{
    const f=proof.files?.[0];
    if(!preview)return;
    if(!f){preview.classList.add('hidden');preview.removeAttribute('src');return;}
    const u=URL.createObjectURL(f);preview.src=u;preview.classList.remove('hidden');preview.onload=()=>URL.revokeObjectURL(u);
  });
  window.addEventListener('my-language-changed',refreshAccount);
  document.querySelector('#langSelect')?.addEventListener('change',()=>setTimeout(refreshAccount,0));
  refreshAccount();

  form.onsubmit=async e=>{
    e.preventDefault();
    const user=auth.currentUser;if(!user){location.href='index.html';return;}
    const c=configs[method.value]||NATCASH;
    if(!c.enabled){notify(tr('monBlocked'));return;}
    const file=proof.files?.[0];if(!file){notify(tr('badPhoto'));return;}
    const value=Number(amount.value);if(!(value>0)||!reference.value.trim())return;
    const oldText=submit.textContent;submit.disabled=true;submit.textContent=tr('sending');
    try{
      let proofImage;
      try{proofImage=await compressImage(file);}catch(err){if(err.message==='too-large'){notify(tr('tooLarge'));return}throw err;}
      const profileSnap=await getDoc(doc(db,'users',user.uid));const profile=profileSnap.exists()?profileSnap.data():{};
      await addDoc(collection(db,'deposits'),{
        userId:user.uid,userEmail:user.email||'',userName:profile.name||user.email||'',
        amount:value,currency:currency.value,method:method.value,reference:reference.value.trim(),
        receiverName:c.name,receiverNumber:c.number,proofImage,proofFileName:file.name||'transaction.jpg',
        proofType:'image/jpeg',status:'pending',createdAt:serverTimestamp()
      });
      form.reset();method.value='NatCash';preview?.classList.add('hidden');preview?.removeAttribute('src');refreshAccount();notify(tr('success'));
    }catch(err){console.error('deposit proof',err);notify(tr('error'));}
    finally{submit.disabled=false;submit.textContent=oldText;}
  };
}
