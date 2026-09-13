let deferredInstallPrompt = null;
const installBtn = document.querySelector('#installAppBtn');
const installStatus = document.querySelector('#installStatus');
const openChromeBtn = document.querySelector('#openChromeBtn');

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

async function preparePwa() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
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

function setStatus(text) {
  if (installStatus) installStatus.textContent = text;
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
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn?.classList.remove('hidden');
  setStatus('Aplikasyon an pare pou enstale. Peze bouton Installer la.');
});

installBtn?.addEventListener('click', async () => {
  if (isStandalone()) return;

  if (!installStatus && !deferredInstallPrompt) {
    window.location.href = '/install.html';
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
      setStatus('Enstalasyon an anile. Ou ka peze Installer ankò.');
    }
    deferredInstallPrompt = null;
    return;
  }

  setStatus('Paj sa a louvri nan yon navigatè entegre. Peze “Ouvri nan Chrome”, apre sa peze Installer ankò.');
  openChromeBtn?.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installBtn?.classList.add('hidden');
  openChromeBtn?.classList.add('hidden');
  setStatus('MY Investissements enstale avèk siksè.');
});
