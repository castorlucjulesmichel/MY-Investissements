let deferredInstallPrompt = null;
const installBtn = document.querySelector('#installAppBtn');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installBtn) installBtn.classList.remove('hidden');
});

installBtn?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    alert('Sou Android/Chrome: peze meni ⋮ epi chwazi "Add to Home screen" oswa "Install app".');
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installBtn?.classList.add('hidden');
});
