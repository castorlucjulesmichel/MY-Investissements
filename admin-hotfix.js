import { db } from './firebase-config.js';
import { doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// Lightweight admin hotfix: only handle localized exchange rates here.
if (document.querySelector('#manualOperationForm')) {
  const $ = s => document.querySelector(s);

  function notify(text) {
    const box = $('#toast');
    if (!box) { alert(text); return; }
    box.textContent = text;
    box.classList.add('show');
    clearTimeout(window.__adminHotfixToast);
    window.__adminHotfixToast = setTimeout(() => box.classList.remove('show'), 3200);
  }

  function parseLocalizedNumber(value) {
    if (typeof value === 'number') return value;
    let s = String(value ?? '').trim().replace(/\s+/g, '');
    if (!s) return NaN;
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
    return Number(s);
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('.approve-request[data-kind="exchange"]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const id = button.dataset.id;
    if (!id) return;

    const rawRate = prompt('Taux réel de l’échange (virgule ou point accepté) :', '');
    if (rawRate === null) return;
    const rate = parseLocalizedNumber(rawRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      notify('Taux invalid. Egzanp valab: 0,0068965517');
      return;
    }

    const reference = (prompt('Référence de l’échange réel :', '') || '').trim();
    if (!reference) {
      notify('Referans obligatwa.');
      return;
    }

    button.disabled = true;
    try {
      await runTransaction(db, async tx => {
        const reqRef = doc(db, 'exchangeRequests', id);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists()) throw new Error('Demann lan pa egziste ankò.');
        const req = reqSnap.data();
        if (req.status !== 'pending') throw new Error('Demann sa a deja trete.');

        const userRef = doc(db, 'users', req.userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error('Envestisè a pa jwenn.');

        const from = req.fromCurrency;
        const to = req.toCurrency;
        const amount = Number(req.amount || 0);
        const balances = { ...(userSnap.data().balances || {}) };
        const available = Number(balances[from] || 0);
        if (!(amount > 0)) throw new Error('Montan echanj la pa valab.');
        if (available < amount) throw new Error('Balans envestisè a pa sifi.');

        const convertedAmount = amount * rate;
        balances[from] = available - amount;
        balances[to] = Number(balances[to] || 0) + convertedAmount;

        tx.update(userRef, { balances, updatedAt: serverTimestamp() });
        tx.update(reqRef, {
          status: 'approved',
          rate,
          convertedAmount,
          adminReference: reference,
          processedAt: serverTimestamp()
        });
      });
      notify(`Echanj valide. Taux: ${String(rate).replace('.', ',')}`);
    } catch (error) {
      console.error('exchange hotfix', error);
      notify(error.message || 'Echanj la pa t kapab valide.');
    } finally {
      button.disabled = false;
    }
  }, true);
}
