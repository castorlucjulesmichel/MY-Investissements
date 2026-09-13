import { db } from './firebase-config.js';
import { doc, setDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// Admin-only fixes for mobile chat and localized exchange rates.
if (document.querySelector('#manualOperationForm')) {
  const $ = s => document.querySelector(s);
  let chatPlaceholder = null;

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
    } else s = s.replace(',', '.');
    return Number(s);
  }

  function ensureChatOverlay() {
    let overlay = $('#adminChatBackdrop');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'adminChatBackdrop';
      overlay.className = 'admin-chat-backdrop';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', background: 'rgba(15,23,42,.62)',
        zIndex: '2147483000', display: 'none'
      });
      document.body.appendChild(overlay);
      overlay.addEventListener('click', closeChatPanel);
    }

    const section = $('#messages');
    if (section && !$('#adminChatClose')) {
      const close = document.createElement('button');
      close.id = 'adminChatClose';
      close.type = 'button';
      close.className = 'admin-chat-close';
      close.setAttribute('aria-label', 'Fèmen mesajri a');
      close.textContent = '×';
      Object.assign(close.style, {
        display: 'none', position: 'absolute', right: '12px', top: '10px',
        zIndex: '3', width: '42px', height: '42px', border: '0',
        borderRadius: '50%', background: '#eef2f7', color: '#14213d',
        fontSize: '28px', lineHeight: '1'
      });
      close.addEventListener('click', closeChatPanel);
      section.prepend(close);
    }
    return { overlay, section };
  }

  function moveChatToBody(section) {
    if (!section || section.parentElement === document.body) return;
    chatPlaceholder = document.createComment('admin-chat-placeholder');
    section.parentNode.insertBefore(chatPlaceholder, section);
    document.body.appendChild(section);
  }

  function restoreChat(section) {
    if (!section || !chatPlaceholder?.parentNode) return;
    chatPlaceholder.parentNode.insertBefore(section, chatPlaceholder);
    chatPlaceholder.remove();
    chatPlaceholder = null;
  }

  function openChatPanel() {
    const { overlay, section } = ensureChatOverlay();
    if (!section) { notify('Paj mesajri a pa jwenn.'); return; }

    $('#sidebar')?.classList.remove('show');
    moveChatToBody(section);

    section.classList.add('admin-chat-panel-open');
    Object.assign(section.style, {
      display: 'block', visibility: 'visible', opacity: '1',
      position: 'fixed', left: '9px', right: '9px', top: '12px', bottom: '12px',
      width: 'auto', maxWidth: '760px', height: 'auto', maxHeight: 'none',
      margin: '0 auto', padding: '58px 14px 18px', overflow: 'auto',
      zIndex: '2147483001', background: '#ffffff', borderRadius: '22px',
      boxShadow: '0 24px 80px rgba(15,23,42,.35)', transform: 'none'
    });
    const close = $('#adminChatClose');
    if (close) close.style.display = 'block';

    overlay.style.display = 'block';
    document.body.classList.add('admin-chat-open');
    document.body.style.overflow = 'hidden';

    try { history.replaceState(null, '', '#messages'); } catch (_) {}
    const select = $('#chatUserSelect');
    if (select && !select.value && select.options.length) select.selectedIndex = 0;
    setTimeout(() => select?.focus({ preventScroll: true }), 80);
  }

  function closeChatPanel() {
    const section = $('#messages');
    const overlay = $('#adminChatBackdrop');
    if (overlay) overlay.style.display = 'none';
    if (section) {
      section.classList.remove('admin-chat-panel-open');
      [
        'display','visibility','opacity','position','left','right','top','bottom','width',
        'max-width','height','max-height','margin','padding','overflow','z-index',
        'background','border-radius','box-shadow','transform'
      ].forEach(p => section.style.removeProperty(p));
      const close = $('#adminChatClose');
      if (close) close.style.display = 'none';
      restoreChat(section);
    }
    document.body.classList.remove('admin-chat-open');
    document.body.style.removeProperty('overflow');
  }

  document.addEventListener('click', event => {
    const chatLink = event.target.closest('a[href="#messages"], .admin-chat-shortcut, .admin-chat-link');
    if (!chatLink) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openChatPanel();
  }, true);

  if (location.hash === '#messages') requestAnimationFrame(openChatPanel);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeChatPanel(); });

  async function setConversation(enabled) {
    const select = $('#chatUserSelect');
    const uid = select?.value || '';
    if (!uid) { notify('Chwazi yon envestisè anvan.'); return; }

    const openBtn = $('#openConversationBtn');
    const closeBtn = $('#closeConversationBtn');
    if (openBtn) openBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = true;

    try {
      const data = { userId: uid, enabled, updatedAt: serverTimestamp() };
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
      notify('Mesajri a pa t kapab chanje. Verifye règ Firestore yo epi eseye ankò.');
    }
  }

  document.addEventListener('click', event => {
    const open = event.target.closest('#openConversationBtn');
    const close = event.target.closest('#closeConversationBtn');
    if (!open && !close) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setConversation(Boolean(open));
  }, true);

  // Accept comma or dot for exchange rates.
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
    if (!reference) { notify('Referans obligatwa.'); return; }

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

        const from = req.fromCurrency, to = req.toCurrency;
        const amount = Number(req.amount || 0);
        const balances = { ...(userSnap.data().balances || {}) };
        const available = Number(balances[from] || 0);
        if (!(amount > 0)) throw new Error('Montan echanj la pa valab.');
        if (available < amount) throw new Error('Balans envestisè a pa sifi.');

        const convertedAmount = amount * rate;
        balances[from] = available - amount;
        balances[to] = Number(balances[to] || 0) + convertedAmount;
        tx.update(userRef, { balances, updatedAt: serverTimestamp() });
        tx.update(reqRef, { status:'approved', rate, convertedAmount, adminReference:reference, processedAt:serverTimestamp() });
      });
      notify(`Echanj valide. Taux: ${String(rate).replace('.', ',')}`);
    } catch (error) {
      console.error('exchange hotfix', error);
      notify(error.message || 'Echanj la pa t kapab valide.');
    } finally { button.disabled = false; }
  }, true);
}
