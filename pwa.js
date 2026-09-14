const PWA_VERSION = '12';
let deferredInstallPrompt = null;

const installBtn = document.querySelector('#installAppBtn');
const installStatus = document.querySelector('#installStatus');
const openChromeBtn = document.querySelector('#openChromeBtn');

const ua = navigator.userAgent || '';
const isAndroid = /Android/i.test(ua);
const isSamsung = /SamsungBrowser\//i.test(ua);
const isChrome = /Chrome\//i.test(ua) && !/SamsungBrowser\//i.test(ua) && !/EdgA\//i.test(ua) && !/OPR\//i.test(ua) && !/Firefox\//i.test(ua) && !/; wv\)/i.test(ua);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function setStatus(text) {
  if (installStatus) installStatus.textContent = text;
}

async function preparePwa() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${PWA_VERSION}`, {
      scope: '/',
      updateViaCache: 'none'
    });
    await registration.update();
    await navigator.serviceWorker.ready;
    return true;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    setStatus('Service aplikasyon an pa rive aktive. Rafrechi paj la epi eseye ankò.');
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
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn?.classList.remove('hidden');
  setStatus('Aplikasyon an pare pou enstale. Peze bouton Installer la.');
});

installBtn?.addEventListener('click', async event => {
  event.preventDefault();

  if (isStandalone()) {
    installBtn.classList.add('hidden');
    setStatus('MY Investissements deja enstale.');
    return;
  }

  await preparePwa();

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

  if (!location.pathname.endsWith('/install.html')) {
    location.href = `/install.html?v=${PWA_VERSION}`;
    return;
  }

  if (isSamsung) {
    setStatus('Ou sou Samsung Internet. Si fenèt enstalasyon an pa parèt, itilize meni navigatè a pou ajoute aplikasyon an sou ekran dakèy la, oswa peze “Ouvri nan Chrome”.');
    openChromeBtn?.classList.remove('hidden');
    return;
  }

  if (isAndroid && !isChrome) {
    setStatus('Pou enstalasyon ki pi serye sou Android, peze “Ouvri nan Chrome”, epi eseye Installer ankò.');
    openChromeBtn?.classList.remove('hidden');
    return;
  }

  setStatus('Si Chrome poko montre fenèt enstalasyon an, peze meni ⋮ epi chwazi “Installer l’application” oswa “Ajouter à l’écran d’accueil”.');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installBtn?.classList.add('hidden');
  openChromeBtn?.classList.add('hidden');
  setStatus('MY Investissements enstale avèk siksè.');
});
