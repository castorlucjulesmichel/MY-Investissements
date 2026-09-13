let deferredInstallPrompt = null;
const installBtn = document.querySelector('#installAppBtn');
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

async function preparePwa() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    await registration.update();
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

preparePwa();

if (installBtn && !isStandalone()) installBtn.classList.remove('hidden');
if (installBtn && isStandalone()) installBtn.classList.add('hidden');

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn?.classList.remove('hidden');
});

installBtn?.addEventListener('click', async () => {
  if (isStandalone()) {
    installBtn.classList.add('hidden');
    return;
  }

  await preparePwa();

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') installBtn.classList.add('hidden');
    deferredInstallPrompt = null;
    return;
  }

  alert('Aplikasyon an pare. Sou Chrome Android, ouvri meni ⋮ epi chwazi “Installer l’application” oswa “Ajouter à l’écran d’accueil”, apre sa peze Ajouter. Si bouton an pa ajoute anyen, verifye nan paramèt ekran dakèy telefòn nan ke “Verrouiller la disposition de l’écran d’accueil” pa aktive.');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installBtn?.classList.add('hidden');
});
