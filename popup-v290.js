const frame = document.getElementById('vaultFrame');

frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  if (!doc) return;

  const style = doc.createElement('link');
  style.rel = 'stylesheet';
  style.href = chrome.runtime.getURL('flat-overrides.css');
  doc.head.appendChild(style);

  const script = doc.createElement('script');
  script.src = chrome.runtime.getURL('visibility.js');
  doc.body.appendChild(script);
});
