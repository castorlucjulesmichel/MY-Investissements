let deferredInstallPrompt = null;

const installBtn = document.querySelector('#installAppBtn');
const installStatus = document.querySelector('#installStatus');
const openChromeBtn = document.querySelector('#openChromeBtn');

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function setStatus(text) {
  if (installStatus) installStatus.textContent = text;
}

async function preparePwa() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js?v=11', {
      scope: '/',
      updateViaCache: 'none'
    });
    await registration.update();
    await navigator.serviceWorker.ready;
    return true;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return false;
  }
}

preparePwa();

if (isStandalone()) {
  installBtn?.classList.add('hidden');
  openChromeBtn?.classList.add('hidden');
  setStatus('MY Investissements deja enstale sou telefòn sa a.');
} else {
  installBtn?.classList.remove('hidden');
}

window.addEventListener('beforeinstallprompt', event => {
  // Sou paj ki pa gen bouton enstalasyon (tankou enskripsyon an),
  // pa bloke pwopozisyon natif navigatè a.
  if (!installBtn) return;

  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.classList.remove('hidden');
  setStatus('Aplikasyon an pare pou enstale. Peze bouton Installer la.');
});

installBtn?.addEventListener('click', async () => {
  if (isStandalone()) {
    installBtn.classList.add('hidden');
    return;
  }

  const ready = await preparePwa();
  if (!ready) {
    setStatus('Service aplikasyon an pa pare. Relouvri paj la nan Chrome epi eseye ankò.');
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      installBtn.classList.add('hidden');
      setStatus('Enstalasyon an kòmanse.');
    } else {
      setStatus('Enstalasyon an anile. Ou ka eseye ankò.');
    }
    deferredInstallPrompt = null;
    return;
  }

  // Si Chrome poko bay beforeinstallprompt, itilize paj enstalasyon dedye a.
  if (!installStatus) {
    window.location.href = '/install.html?v=11';
    return;
  }

  setStatus('Si fenèt enstalasyon an pa parèt, itilize meni ⋮ Chrome a epi chwazi “Installer l’application” oswa “Ajouter à l’écran d’accueil”.');
  openChromeBtn?.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installBtn?.classList.add('hidden');
  openChromeBtn?.classList.add('hidden');
  setStatus('MY Investissements enstale avèk siksè.');
});
