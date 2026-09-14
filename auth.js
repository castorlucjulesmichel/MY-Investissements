const $ = selector => document.querySelector(selector);
const msg = $('#authMessage');

function show(text, ok = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.className = `form-message ${ok ? 'ok' : 'error'}`;
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const login = btn.dataset.tab === 'login';
      $('#loginForm')?.classList.toggle('hidden', !login);
      $('#registerForm')?.classList.toggle('hidden', login);
      if (msg) msg.textContent = '';
    });
  });
}

// UI prensipal la dwe mache menm si Firebase pran tan oswa echwe chaje.
bindTabs();

import('./i18n.js?v=13')
  .then(mod => mod.bindLanguageSelector?.())
  .catch(error => console.warn('Language module unavailable:', error));

let firebasePromise = null;
function loadFirebase() {
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import('./firebase-config.js?v=13'),
      import('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js')
    ]).then(([config, authApi, firestoreApi]) => ({
      auth: config.auth,
      db: config.db,
      ...authApi,
      ...firestoreApi
    }));
  }
  return firebasePromise;
}

async function isAdmin(ctx, uid) {
  const snap = await ctx.getDoc(ctx.doc(ctx.db, 'admins', uid));
  return snap.exists() && snap.data().active !== false;
}

async function routeUser(ctx, user) {
  try {
    if (await isAdmin(ctx, user.uid)) {
      location.href = 'admin.html';
      return;
    }
    const snap = await ctx.getDoc(ctx.doc(ctx.db, 'users', user.uid));
    if (snap.exists()) {
      location.href = 'investisseur.html';
      return;
    }
    show('Kont la egziste, men pwofil itilizatè a pa jwenn nan Firestore.');
  } catch (error) {
    console.error(error);
    show('Aksè enposib. Verifye koneksyon entènèt ak konfigirasyon Firestore.');
  }
}

$('#loginForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  show('Koneksyon ap fèt...', true);
  try {
    const ctx = await loadFirebase();
    const result = await ctx.signInWithEmailAndPassword(
      ctx.auth,
      $('#loginEmail').value.trim(),
      $('#loginPassword').value
    );
    await routeUser(ctx, result.user);
  } catch (error) {
    console.error(error);
    show('Koneksyon pa reyisi. Verifye imèl, modpas ak koneksyon entènèt la.');
  }
});

$('#registerForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  show('Kreyasyon kont lan ap fèt...', true);
  try {
    const ctx = await loadFirebase();
    const name = $('#registerName').value.trim();
    const result = await ctx.createUserWithEmailAndPassword(
      ctx.auth,
      $('#registerEmail').value.trim(),
      $('#registerPassword').value
    );

    await ctx.setDoc(ctx.doc(ctx.db, 'users', result.user.uid), {
      uid: result.user.uid,
      name,
      email: result.user.email,
      role: 'investor',
      status: 'active',
      balances: { HTG: 0, USD: 0, EUR: 0, CAD: 0 },
      createdAt: ctx.serverTimestamp()
    });

    location.href = 'investisseur.html';
  } catch (error) {
    console.error(error);
    if (error?.code === 'auth/email-already-in-use') {
      show('Adrès imèl sa a deja itilize.');
    } else {
      show('Enskripsyon pa reyisi. Verifye enfòmasyon yo, entènèt la ak règ Firestore yo.');
    }
  }
});

// Auto-redirection pa dwe anpeche bouton yo mache si Firebase pa chaje.
loadFirebase()
  .then(ctx => {
    ctx.onAuthStateChanged(ctx.auth, user => {
      if (user) routeUser(ctx, user);
    });
  })
  .catch(error => console.warn('Firebase unavailable on page load:', error));

window.__MY_AUTH_UI_READY = true;
