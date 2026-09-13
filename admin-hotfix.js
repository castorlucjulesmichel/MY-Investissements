import { db } from './firebase-config.js';
import { doc, setDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// This file only acts on the admin page.
if (document.querySelector('#manualOperationForm')) {
  const $ = s => document.querySelector(s);

  function notify(text) {
    const box = $('#toast');
    if (!box) {
      alert(text);
      return;
    }
    box.textContent = text;
    box.classList.add('show');
    clearTimeout(window.__adminHotfixToast);
    window.__adminHotfixToast = setTimeout(() => box.classList.remove('show'), 3200);
  }

  function parseLocalizedNumber(value) {
    if (typeof value === 'number') return value;
    let s = String(value ?? '').trim().replace(/\s+/g, '');
    if (!s) return NaN;

    // Accept both 0,0068965517 and 0.0068965517.
    // If both separators are present, treat the last one as the decimal mark.
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else {
      s = s.replace(',', '.');
    }
    return Number(s);
  }

  function goToChat() {
    const section = $('#messages');
    if (!section) return;
    $('#sidebar')?.classList.remove('show');
    requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { history.replaceState(null, '', '#messages'); } catch (_) {}
      const select = $('#chatUserSelect');
      if (select && !select.value && select.options.length) select.selectedIndex = 0;
      select?.focus({ preventScroll: true });
    });
  }

  // Make every admin chat shortcut work reliably on mobile instead of relying
  // only on the browser's hash jump while the sidebar is open.
  document.addEventListener('click', event => {
    const chatLink = event.target.closest('a[href="#messages"], .admin-chat-shortcut, .admin-chat-link');
    if (!chatLink) return;
    event.preventDefault();
    goToChat();
  }, true);

  async function setConversation(enabled) {
    const select = $('#chatUserSelect');
    const uid = select?.value || '';
    if (!uid) {
      notify('Chwazi yon envestisè anvan.');
      return;
    }

    const openBtn = $('#openConversationBtn');
    const closeBtn = $('#closeConversationBtn');
    if (openBtn) openBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = true;

    try {
      const data = {
        userId: uid,
        enabled,
        updatedAt: serverTimestamp()
      };
      if (enabled) data.openedAt = serverTimestamp();
      else data.closedAt = serverTimestamp();

      await setDoc(doc(db, 'conversations', uid), data, { merge: true });

      const status = $('#conversationStatus');
      if (status) {
        status.textContent = enabled ? 'Louvri' : 'Fèmen';
        status.className = `status ${enabled ? 'active' : 'pending'}`;
      }
      $('#adminMessageForm')?.classList.toggle('hidden', !enabled);
      if (openBtn) openBtn.disabled = enabled;
      if (closeBtn) closeBtn.disabled = !enabled;
      notify(enabled ? 'Mesajri a louvri pou envestisè sa a.' : 'Mesajri a fèmen.');
    } catch (error) {
      console.error('conversation hotfix', error);
      if (openBtn) openBtn.disabled = false;
      if (closeBtn) closeBtn.disabled = false;
      notify('Mesajri a pa t kapab chanje. Verifye koneksyon an epi eseye ankò.');
    }
  }

  // Capture these clicks before the older handler. This also avoids cases where
  // the dynamically created button appears but its original handler is stale.
  document.addEventListener('click', event => {
    const open = event.target.closest('#openConversationBtn');
    const close = event.target.closest('#closeConversationBtn');
    if (!open && !close) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setConversation(Boolean(open));
  }, true);

  // Accept a comma or a dot when the admin validates an exchange rate.
  // Example: 0,0068965517 is normalized to 0.0068965517 before calculation.
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
