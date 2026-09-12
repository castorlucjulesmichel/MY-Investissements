import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const list=document.querySelector('#requestsList');
if(list){
  const words={
    fr:{proof:'Preuve photo',method:'Méthode',reference:'Référence',receiver:'Compte crédité',open:'Voir la photo'},
    ht:{proof:'Prèv foto',method:'Metòd',reference:'Referans',receiver:'Kont ki resevwa a',open:'Gade foto a'},
    en:{proof:'Photo proof',method:'Method',reference:'Reference',receiver:'Receiving account',open:'View photo'},
    es:{proof:'Prueba fotográfica',method:'Método',reference:'Referencia',receiver:'Cuenta receptora',open:'Ver foto'}
  };
  const lang=()=>localStorage.getItem('my_lang')||document.documentElement.lang||'fr';
  const t=k=>words[lang()]?.[k]||words.fr[k];
  let box=document.querySelector('#proofLightbox');
  if(!box){box=document.createElement('div');box.id='proofLightbox';box.className='proof-lightbox';box.innerHTML='<button type="button" aria-label="Fermer">×</button><img alt="Preuve de transaction">';document.body.appendChild(box);box.querySelector('button').onclick=()=>box.classList.remove('show');box.onclick=e=>{if(e.target===box)box.classList.remove('show')};}
  const img=box.querySelector('img');
  function open(src){img.src=src;box.classList.add('show')}
  function metaLine(label,value){const s=document.createElement('span');s.textContent=`${label}: ${value||'—'}`;return s;}
  async function decorate(){
    const buttons=[...list.querySelectorAll('.approve-request[data-kind="deposit"]')];
    for(const b of buttons){
      const card=b.closest('.request-card');if(!card||card.dataset.proofReady==='1')continue;
      card.dataset.proofReady='1';
      try{
        const snap=await getDoc(doc(db,'deposits',b.dataset.id));if(!snap.exists())continue;const d=snap.data();
        const wrap=document.createElement('div');wrap.className='deposit-proof-admin';
        const meta=document.createElement('div');meta.className='proof-meta';
        meta.append(metaLine(t('method'),d.method),metaLine(t('reference'),d.reference));
        if(d.receiverNumber)meta.append(metaLine(t('receiver'),`${d.receiverName||''} ${d.receiverNumber}`.trim()));
        wrap.appendChild(meta);
        if(d.proofImage){
          const title=document.createElement('strong');title.textContent=t('proof');title.style.display='block';title.style.marginBottom='7px';wrap.appendChild(title);
          const photo=document.createElement('img');photo.className='deposit-proof-thumb';photo.src=d.proofImage;photo.alt=t('proof');photo.title=t('open');photo.onclick=()=>open(d.proofImage);wrap.appendChild(photo);
        }
        const left=card.firstElementChild||card;left.appendChild(wrap);
      }catch(e){console.error('proof admin',e);card.dataset.proofReady='';}
    }
  }
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})};
  new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  window.addEventListener('my-language-changed',()=>{list.querySelectorAll('.request-card').forEach(c=>c.dataset.proofReady='');schedule()});
  schedule();
}
