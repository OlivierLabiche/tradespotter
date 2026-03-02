// TradeSpotter Extension - Background Service Worker

const TRADESPOTTER_URL = 'https://tradespotter.netlify.app';

// Gérer le clic sur l'icône de l'extension
chrome.action.onClicked.addListener(async (tab) => {
  // Vérifier qu'on est sur TradingView
  if (!tab.url || !tab.url.includes('tradingview.com')) {
    // Afficher un message d'erreur
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      css: getPopupCSS()
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showError,
      args: ['Ouvre TradingView pour utiliser TradeSpotter']
    });
    return;
  }

  try {
    // 1. Extraire les données de TradingView via content script
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTradingViewData
    });
    
    const tvData = result.result || {};
    console.log('TradeSpotter: Données extraites', tvData);
    
    // 2. Prendre le screenshot
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100
    });
    
    // 3. Copier le screenshot dans le presse-papier
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: copyImageToClipboard,
      args: [screenshotDataUrl]
    });
    
    // 4. Injecter et afficher le popup de sélection
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      css: getPopupCSS()
    });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showDirectionPopup,
      args: [tvData, TRADESPOTTER_URL]
    });
    
  } catch (error) {
    console.error('TradeSpotter: Erreur', error);
    // Afficher une notification d'erreur
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      css: getPopupCSS()
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showError,
      args: [error.message]
    });
  }
});

// Fonction injectée pour extraire les données TradingView
function extractTradingViewData() {
  const data = {
    asset: '',
    timeframe: '',
    timestamp: new Date().toISOString()
  };
  
  // Extraire le symbole depuis le header ou le titre
  // Méthode 1: Depuis le sélecteur de symbole
  const symbolElement = document.querySelector('[data-symbol-short]');
  if (symbolElement) {
    data.asset = symbolElement.getAttribute('data-symbol-short') || symbolElement.textContent.trim();
  }
  
  // Méthode 2: Depuis le titre de la page
  if (!data.asset) {
    const title = document.title;
    const match = title.match(/^([A-Z0-9]+)/);
    if (match) {
      data.asset = match[1];
    }
  }
  
  // Méthode 3: Depuis l'URL
  if (!data.asset) {
    const urlMatch = window.location.pathname.match(/symbol=([A-Z0-9:]+)/i);
    if (urlMatch) {
      data.asset = urlMatch[1].split(':').pop();
    }
  }
  
  // Méthode 4: Depuis le widget header
  if (!data.asset) {
    const headerSymbol = document.querySelector('.chart-widget-header .symbol-info span, .tv-symbol-header__first-row span');
    if (headerSymbol) {
      data.asset = headerSymbol.textContent.trim().replace(/[^A-Z0-9]/gi, '');
    }
  }
  
  // Méthode 5: Data attribute sur le chart
  if (!data.asset) {
    const chartContainer = document.querySelector('[data-symbol]');
    if (chartContainer) {
      data.asset = chartContainer.getAttribute('data-symbol');
    }
  }
  
  // Extraire le timeframe
  const tfElement = document.querySelector('[data-value][data-role="button"]');
  if (tfElement) {
    data.timeframe = tfElement.getAttribute('data-value') || tfElement.textContent.trim();
  }
  
  // Méthode alternative pour timeframe
  if (!data.timeframe) {
    const tfButton = document.querySelector('.chart-toolbar button[class*="interval"], .apply-common-tooltip[data-name="date-ranges-menu"]');
    if (tfButton) {
      data.timeframe = tfButton.textContent.trim();
    }
  }
  
  // Nettoyer l'asset (enlever exchange prefix si présent)
  if (data.asset && data.asset.includes(':')) {
    data.asset = data.asset.split(':').pop();
  }
  
  return data;
}

// Fonction injectée pour copier l'image dans le presse-papier
async function copyImageToClipboard(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    console.log('TradeSpotter: Screenshot copié dans le presse-papier');
    return true;
  } catch (error) {
    console.error('TradeSpotter: Erreur copie presse-papier', error);
    return false;
  }
}

// CSS du popup
function getPopupCSS() {
  return `
    .tradespotter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .tradespotter-popup {
      background: #1a1a25;
      border: 1px solid #2a2a3a;
      border-radius: 16px;
      padding: 24px;
      min-width: 340px;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: tsPopupIn 0.2s ease;
    }
    @keyframes tsPopupIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .tradespotter-popup h2 {
      color: #00d4aa;
      margin: 0 0 8px 0;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tradespotter-popup .ts-asset {
      color: #e8e8ed;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .tradespotter-popup .ts-asset .ts-dir-long {
      color: #00d4aa;
      font-size: 16px;
      margin-left: 8px;
    }
    .tradespotter-popup .ts-asset .ts-dir-short {
      color: #ff4757;
      font-size: 16px;
      margin-left: 8px;
    }
    .tradespotter-popup .ts-info {
      color: #8b8b9a;
      font-size: 13px;
      margin-bottom: 20px;
      padding: 12px;
      background: #12121a;
      border-radius: 8px;
    }
    .tradespotter-popup .ts-info .ts-check {
      color: #00d4aa;
      margin-right: 6px;
    }
    .tradespotter-popup .ts-step-label {
      color: #8b8b9a;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .tradespotter-popup .ts-buttons {
      display: flex;
      gap: 12px;
    }
    .tradespotter-popup .ts-btn {
      flex: 1;
      padding: 16px 20px;
      border: 2px solid transparent;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: transparent;
    }
    .tradespotter-popup .ts-btn-long {
      background: rgba(0, 212, 170, 0.15);
      color: #00d4aa;
      border-color: #00d4aa;
    }
    .tradespotter-popup .ts-btn-long:hover {
      background: rgba(0, 212, 170, 0.3);
      transform: scale(1.02);
    }
    .tradespotter-popup .ts-btn-short {
      background: rgba(255, 71, 87, 0.15);
      color: #ff4757;
      border-color: #ff4757;
    }
    .tradespotter-popup .ts-btn-short:hover {
      background: rgba(255, 71, 87, 0.3);
      transform: scale(1.02);
    }
    .tradespotter-popup .ts-btn span {
      font-size: 24px;
    }
    .tradespotter-popup .ts-cancel {
      margin-top: 16px;
      text-align: center;
    }
    .tradespotter-popup .ts-cancel button {
      background: none;
      border: none;
      color: #5a5a6e;
      cursor: pointer;
      font-size: 13px;
      padding: 8px 16px;
    }
    .tradespotter-popup .ts-cancel button:hover {
      color: #8b8b9a;
    }
    
    /* Mindset buttons */
    .tradespotter-popup .ts-mindset-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tradespotter-popup .ts-btn-plan {
      background: rgba(0, 212, 170, 0.1);
      color: #e8e8ed;
      border-color: #2a2a3a;
      text-align: left;
      align-items: flex-start;
    }
    .tradespotter-popup .ts-btn-plan:hover {
      border-color: #00d4aa;
      background: rgba(0, 212, 170, 0.2);
    }
    .tradespotter-popup .ts-btn-intuitif {
      background: rgba(255, 165, 2, 0.1);
      color: #e8e8ed;
      border-color: #2a2a3a;
      text-align: left;
      align-items: flex-start;
    }
    .tradespotter-popup .ts-btn-intuitif:hover {
      border-color: #ffa502;
      background: rgba(255, 165, 2, 0.2);
    }
    .tradespotter-popup .ts-btn-title {
      font-size: 15px;
      font-weight: 600;
    }
    .tradespotter-popup .ts-btn-sub {
      font-size: 12px;
      color: #5a5a6e;
      font-weight: 400;
    }
    .tradespotter-popup .ts-btn-plan .ts-btn-title {
      color: #00d4aa;
    }
    .tradespotter-popup .ts-btn-intuitif .ts-btn-title {
      color: #ffa502;
    }
    
    /* Cooldown screen */
    .tradespotter-popup .ts-cooldown {
      text-align: center;
      padding: 10px 0;
    }
    .tradespotter-popup .ts-cooldown-icon {
      font-size: 48px;
      margin-bottom: 12px;
      animation: tsShake 0.5s ease-in-out;
    }
    @keyframes tsShake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }
    .tradespotter-popup .ts-cooldown-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffa502;
      margin-bottom: 16px;
    }
    .tradespotter-popup .ts-cooldown-text {
      color: #8b8b9a;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 8px;
    }
    .tradespotter-popup .ts-cooldown-text strong {
      color: #ff4757;
    }
    .tradespotter-popup .ts-cooldown-question {
      color: #e8e8ed;
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .tradespotter-popup .ts-cooldown-timer {
      margin-bottom: 20px;
    }
    .tradespotter-popup .ts-timer-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 4px solid #ffa502;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      animation: tsPulse 1s ease-in-out infinite;
    }
    @keyframes tsPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    .tradespotter-popup .ts-timer-number {
      font-size: 36px;
      font-weight: 700;
      color: #ffa502;
    }
    .tradespotter-popup .ts-btn-confirm {
      width: 100%;
      padding: 14px 20px;
      border: 2px solid #3a3a4a;
      border-radius: 10px;
      background: #2a2a3a;
      color: #5a5a6e;
      font-size: 14px;
      font-weight: 600;
      cursor: not-allowed;
      transition: all 0.3s;
    }
    .tradespotter-popup .ts-btn-confirm.ts-btn-ready {
      border-color: #ffa502;
      background: rgba(255, 165, 2, 0.2);
      color: #ffa502;
      cursor: pointer;
    }
    .tradespotter-popup .ts-btn-confirm.ts-btn-ready:hover {
      background: rgba(255, 165, 2, 0.3);
    }
    
    /* Toast */
    .tradespotter-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1a1a25;
      border: 1px solid #00d4aa;
      color: #e8e8ed;
      padding: 16px 24px;
      border-radius: 12px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: tsToastIn 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tradespotter-toast.error {
      border-color: #ff4757;
    }
    @keyframes tsToastIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
}

// Fonction injectée pour afficher le popup de direction
function showDirectionPopup(tvData, baseUrl) {
  // Supprimer tout popup existant
  const existing = document.querySelector('.tradespotter-overlay');
  if (existing) existing.remove();
  
  // Créer l'overlay
  const overlay = document.createElement('div');
  overlay.className = 'tradespotter-overlay';
  
  const asset = tvData.asset || 'UNKNOWN';
  const timeframe = tvData.timeframe || '';
  let selectedDirection = null;
  let selectedMindset = null;
  
  // Étape 1: Choix de la direction
  function showStep1() {
    overlay.innerHTML = `
      <div class="tradespotter-popup">
        <h2>◈ TradeSpotter</h2>
        <div class="ts-asset">${asset}</div>
        <div class="ts-info">
          <span class="ts-check">✓</span> Screenshot copié dans le presse-papier<br>
          <small style="color: #5a5a6e; margin-left: 18px;">Ctrl+V dans TradeSpotter pour coller</small>
        </div>
        <div class="ts-step-label">Direction du trade</div>
        <div class="ts-buttons">
          <button class="ts-btn ts-btn-long" data-direction="long">
            <span>📈</span>
            LONG
          </button>
          <button class="ts-btn ts-btn-short" data-direction="short">
            <span>📉</span>
            SHORT
          </button>
        </div>
        <div class="ts-cancel">
          <button class="ts-btn-cancel">Annuler</button>
        </div>
      </div>
    `;
    
    overlay.querySelector('.ts-btn-long').addEventListener('click', () => {
      selectedDirection = 'long';
      showStep2();
    });
    
    overlay.querySelector('.ts-btn-short').addEventListener('click', () => {
      selectedDirection = 'short';
      showStep2();
    });
    
    overlay.querySelector('.ts-btn-cancel').addEventListener('click', closePopup);
  }
  
  // Étape 2: Choix du mindset (anti-impulsif)
  function showStep2() {
    const dirLabel = selectedDirection === 'long' ? '📈 LONG' : '📉 SHORT';
    const dirClass = selectedDirection === 'long' ? 'ts-dir-long' : 'ts-dir-short';
    
    overlay.innerHTML = `
      <div class="tradespotter-popup">
        <h2>◈ TradeSpotter</h2>
        <div class="ts-asset">${asset} <span class="${dirClass}">${dirLabel}</span></div>
        <div class="ts-step-label">Quel est ton état d'esprit ?</div>
        <div class="ts-mindset-buttons">
          <button class="ts-btn ts-btn-plan" data-mindset="plan">
            <span>🎯</span>
            <div class="ts-btn-title">Je respecte le plan</div>
            <div class="ts-btn-sub">Setup validé par ma stratégie</div>
          </button>
          <button class="ts-btn ts-btn-intuitif" data-mindset="intuitif">
            <span>🎲</span>
            <div class="ts-btn-title">Mode intuitif</div>
            <div class="ts-btn-sub">Feeling / FOMO / Revenge</div>
          </button>
        </div>
        <div class="ts-cancel">
          <button class="ts-btn-back">← Retour</button>
        </div>
      </div>
    `;
    
    overlay.querySelector('.ts-btn-plan').addEventListener('click', () => {
      selectedMindset = 'plan';
      openTradeSpotter();
    });
    
    overlay.querySelector('.ts-btn-intuitif').addEventListener('click', () => {
      selectedMindset = 'intuitif';
      showCooldown();
    });
    
    overlay.querySelector('.ts-btn-back').addEventListener('click', showStep1);
  }
  
  // Étape 3: Cooldown de 5 secondes pour mode intuitif
  function showCooldown() {
    let countdown = 5;
    
    overlay.innerHTML = `
      <div class="tradespotter-popup">
        <h2>◈ TradeSpotter</h2>
        <div class="ts-asset">${asset}</div>
        <div class="ts-cooldown">
          <div class="ts-cooldown-icon">🎲</div>
          <div class="ts-cooldown-title">Mode Intuitif</div>
          <div class="ts-cooldown-text">
            Tu es sur le point de prendre un trade<br>
            <strong>hors de ton plan</strong>.
          </div>
          <div class="ts-cooldown-question">Es-tu vraiment sûr de toi ?</div>
          <div class="ts-cooldown-timer">
            <div class="ts-timer-circle">
              <span class="ts-timer-number" id="tsCountdown">${countdown}</span>
            </div>
          </div>
          <button class="ts-btn ts-btn-confirm" id="tsConfirmBtn" disabled>
            ⏳ Patiente ${countdown}s...
          </button>
        </div>
        <div class="ts-cancel">
          <button class="ts-btn-back">← J'ai changé d'avis</button>
        </div>
      </div>
    `;
    
    const countdownEl = document.getElementById('tsCountdown');
    const confirmBtn = document.getElementById('tsConfirmBtn');
    
    const timer = setInterval(() => {
      countdown--;
      countdownEl.textContent = countdown;
      confirmBtn.textContent = `⏳ Patiente ${countdown}s...`;
      
      if (countdown <= 0) {
        clearInterval(timer);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '🎲 Je confirme mon trade intuitif';
        confirmBtn.classList.add('ts-btn-ready');
      }
    }, 1000);
    
    confirmBtn.addEventListener('click', () => {
      if (!confirmBtn.disabled) {
        clearInterval(timer);
        openTradeSpotter();
      }
    });
    
    overlay.querySelector('.ts-btn-back').addEventListener('click', () => {
      clearInterval(timer);
      showStep2();
    });
  }
  
  function openTradeSpotter() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    
    const params = new URLSearchParams({
      asset: asset,
      direction: selectedDirection,
      mindset: selectedMindset,
      date: date,
      time: time,
      tf: timeframe,
      from: 'extension'
    });
    
    const url = `${baseUrl}/trade.html?${params.toString()}`;
    window.open(url, '_blank');
    closePopup();
  }
  
  function closePopup() {
    overlay.remove();
    document.removeEventListener('keydown', handleKeydown);
  }
  
  // Raccourcis clavier
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closePopup();
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });
  
  document.body.appendChild(overlay);
  showStep1();
}

// Fonction pour afficher une erreur
function showError(message) {
  const existing = document.querySelector('.tradespotter-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'tradespotter-toast error';
  toast.innerHTML = `❌ Erreur: ${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 5000);
}
