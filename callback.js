(function () {
  const codeEl = document.getElementById('code-value');
  const stateEl = document.getElementById('state-value');
  const copyButton = document.getElementById('copy-button');

  if (!codeEl || !stateEl || !copyButton) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (code) {
    codeEl.textContent = code;
    copyButton.disabled = !navigator.clipboard;
  } else {
    codeEl.textContent = 'No code parameter found.';
    copyButton.disabled = true;
  }

  stateEl.textContent = state ? state : 'No state parameter provided.';

  copyButton.addEventListener('click', async () => {
    if (!code || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = 'Copied!';
      copyButton.classList.add('success');
      copyButton.classList.remove('error');
      setTimeout(() => {
        copyButton.textContent = 'Copy code to clipboard';
        copyButton.classList.remove('success');
      }, 2500);
    } catch (error) {
      console.error('Clipboard copy failed', error);
      copyButton.textContent = 'Copy failed, copy manually';
      copyButton.classList.add('error');
      copyButton.classList.remove('success');
    }
  });
})();
