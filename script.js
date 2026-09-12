const state={balance:Number(localStorage.getItem('my_balance')||0),invested:Number(localStorage.getItem('my_invested')||0),weekly:Number(localStorage.getItem('my_weekly')||0),history:JSON.parse(localStorage.getItem('my_history')||'[]')};

const $=s=>document.querySelector(s);
const money=n=>`${Math.round(Number(n)||0).toLocaleString('fr-FR')} HTG`;
const save=()=>{localStorage.setItem('my_balance',state.balance);localStorage.setItem('my_invested',state.invested);localStorage.setItem('my_weekly',state.weekly);localStorage.setItem('my_history',JSON.stringify(state.history));};

function renderStats(){
  $('#balanceDisplay').textContent=money(state.balance);
  $('#investedDisplay').textContent=money(state.invested);
  $('#weeklyDisplay').textContent=money(state.weekly);
  $('#yearlyDisplay').textContent=money(state.weekly*52);
}

function renderHistory(){
  const body=$('#historyBody');
  if(!state.history.length){body.innerHTML='<tr><td colspan="5" class="empty">Aucune opération pour le moment.</td></tr>';return;}
  body.innerHTML=state.history.slice().reverse().map(item=>`<tr>
    <td>${item.date}</td>
    <td>${item.type}</td>
    <td>${item.detail}</td>
    <td>${money(item.amount)}</td>
    <td><span class="status ${item.statusClass}">${item.status}</span></td>
  </tr>`).join('');
}

function toast(message){
  const el=$('#toast');
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}

const modal=$('#depositModal');
function openModal(){modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
function closeModal(){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}

$('#menuBtn').addEventListener('click',()=>$('#mainNav').classList.toggle('show'));
document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',()=>$('#mainNav').classList.remove('show')));
$('#openDeposit').addEventListener('click',openModal);
$('#openDepositTop').addEventListener('click',openModal);
$('#closeDeposit').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});

document.querySelectorAll('.invest-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const level=btn.dataset.level;
    const amount=Number(btn.dataset.amount);
    const rate=Number(btn.dataset.rate);
    if(state.balance<amount){
      toast(`Solde test insuffisant pour ${level}. Ajoutez d'abord un dépôt test.`);
      openModal();
      $('#depositAmount').value=amount;
      return;
    }
    if(!confirm(`Activer ${level} avec ${money(amount)} depuis le solde démo ?`))return;
    state.balance-=amount;
    state.invested+=amount;
    state.weekly+=amount*rate;
    state.history.push({date:new Date().toLocaleDateString('fr-FR'),type:'Investissement',detail:level,amount,status:'Actif',statusClass:'active'});
    save();renderStats();renderHistory();toast(`${level} activé en mode démonstration.`);
  });
});

$('#calcBtn').addEventListener('click',()=>{
  const amount=Math.max(0,Number($('#calcAmount').value)||0);
  const rate=Math.max(0,Number($('#calcRate').value)||0)/100;
  const week=amount*rate;
  $('#calcWeek').textContent=money(week);
  $('#calcYear').textContent=money(week*52);
});

$('#depositForm').addEventListener('submit',e=>{
  e.preventDefault();
  const amount=Number($('#depositAmount').value);
  const ref=$('#depositRef').value.trim();
  const sender=$('#senderName').value.trim();
  if(!amount||amount<=0||!ref||!sender){toast('Remplissez tous les champs.');return;}

  state.history.push({
    date:new Date().toLocaleDateString('fr-FR'),
    type:'Dépôt NatCash',
    detail:`${sender} • Réf. ${ref}`,
    amount,
    status:'En attente',
    statusClass:'pending'
  });
  save();renderHistory();
  e.target.reset();closeModal();
  toast('Demande test enregistrée. Le solde n\'a pas été crédité automatiquement.');
});

renderStats();
renderHistory();
