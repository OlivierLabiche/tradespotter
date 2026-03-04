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

  // Méthode 1: Titre de la page (toujours fiable, ex: "BTCUSD 68 847,00 ...")
  const titleMatch = document.title.match(/^([A-Z0-9]+)/i);
  if (titleMatch) {
    data.asset = titleMatch[1];
  }

  // Méthode 2: Depuis l'URL (query string, avec décodage du %3A)
  if (!data.asset) {
    const urlMatch = window.location.href.match(/[?&]symbol=([^&]+)/i);
    if (urlMatch) {
      const decoded = decodeURIComponent(urlMatch[1]);
      data.asset = decoded.split(':').pop().replace(/[^A-Z0-9.]/gi, '');
    }
  }

  // Méthode 3: Légende scoped au conteneur principal du graphique
  // (évite de matcher les éléments de la watchlist/sidebar)
  if (!data.asset) {
    const chartArea = document.querySelector('.chart-markup-table, .layout__area--center, [class*="chart-markup"]');
    const legendTitle = (chartArea || document).querySelector('[data-name="legend-source-title"]');
    if (legendTitle) {
      const text = legendTitle.textContent.trim().replace(/[^A-Z0-9.:]/gi, '');
      if (text) {
        data.asset = text.split(':').pop();
      }
    }
  }

  // Méthode 4: Attribut data-symbol-short
  if (!data.asset) {
    const symbolElement = document.querySelector('[data-symbol-short]');
    if (symbolElement) {
      data.asset = symbolElement.getAttribute('data-symbol-short') || symbolElement.textContent.trim();
    }
  }

  // Méthode 5: Depuis le widget header
  if (!data.asset) {
    const headerSymbol = document.querySelector('.chart-widget-header .symbol-info span, .tv-symbol-header__first-row span');
    if (headerSymbol) {
      data.asset = headerSymbol.textContent.trim().replace(/[^A-Z0-9]/gi, '');
    }
  }

  // Méthode 6: Data attribute sur le chart
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
    .tradespotter-popup .ts-btn-confirm {
      width: 100%;
      padding: 14px 20px;
      border: 2px solid #ffa502;
      border-radius: 10px;
      background: rgba(255, 165, 2, 0.2);
      color: #ffa502;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .tradespotter-popup .ts-btn-confirm:hover {
      background: rgba(255, 165, 2, 0.3);
      cursor: pointer;
    }
    .tradespotter-popup .ts-btn-confirm.ts-btn-ready:hover {
      background: rgba(255, 165, 2, 0.3);
    }
    
    /* Combobox Setup (étape 3) */
    .tradespotter-popup .ts-combobox { position: relative; }
    .tradespotter-popup .ts-setup-input {
      width: 100%;
      padding: 12px 38px 12px 14px;
      background: #12121a;
      border: 1px solid #2a2a3a;
      border-radius: 8px;
      color: #e8e8ed;
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
      font-family: inherit;
    }
    .tradespotter-popup .ts-setup-input:focus { border-color: #00d4aa; }
    .tradespotter-popup .ts-setup-input::placeholder { color: #5a5a6e; }
    .tradespotter-popup .ts-combobox-toggle {
      position: absolute;
      right: 11px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #5a5a6e;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      line-height: 1;
    }
    .tradespotter-popup .ts-combobox-toggle:hover { color: #8b8b9a; }
    .tradespotter-popup .ts-combobox-list {
      display: none;
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #12121a;
      border: 1px solid #2a2a3a;
      border-radius: 8px;
      z-index: 100;
      max-height: 180px;
      overflow-y: auto;
    }
    .tradespotter-popup .ts-combobox-list.ts-open { display: block; }
    .tradespotter-popup .ts-combobox-item {
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      color: #e8e8ed;
    }
    .tradespotter-popup .ts-combobox-item:hover { background: #1a1a25; }
    .tradespotter-popup .ts-combobox-empty {
      padding: 10px 14px;
      color: #5a5a6e;
      font-size: 12px;
      font-style: italic;
    }
    .tradespotter-popup .ts-btn-open {
      width: 100%;
      padding: 14px 20px;
      border: 2px solid #00d4aa;
      border-radius: 10px;
      background: rgba(0, 212, 170, 0.15);
      color: #00d4aa;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 16px;
    }
    .tradespotter-popup .ts-btn-open:hover { background: rgba(0, 212, 170, 0.3); }

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
      showStep3();
    });

    overlay.querySelector('.ts-btn-intuitif').addEventListener('click', () => {
      selectedMindset = 'intuitif';
      showStep3();
    });
    
    overlay.querySelector('.ts-btn-back').addEventListener('click', showStep1);
  }
  
  // Étape 3: Choix du setup
  function showStep3() {
    const dirLabel = selectedDirection === 'long' ? '📈 LONG' : '📉 SHORT';
    const dirClass = selectedDirection === 'long' ? 'ts-dir-long' : 'ts-dir-short';

    // Récupérer les setups sauvegardés dans localStorage (domaine TradingView)
    const savedSetups = JSON.parse(localStorage.getItem('ts_setups') || '[]');

    overlay.innerHTML = `
      <div class="tradespotter-popup">
        <h2>◈ TradeSpotter</h2>
        <div class="ts-asset">${asset} <span class="${dirClass}">${dirLabel}</span></div>
        <div class="ts-step-label">Quel setup as-tu utilisé ?</div>
        <div class="ts-combobox" id="tsSetupCombo">
          <input type="text" class="ts-setup-input" id="tsSetupInput" placeholder="Ex: BOS + FVG, Liquidation sweep..." autocomplete="off">
          <button type="button" class="ts-combobox-toggle" id="tsComboToggle">▾</button>
          <div class="ts-combobox-list" id="tsSetupList"></div>
        </div>
        <div style="margin-top: 14px;">
          <div class="ts-step-label" style="margin-bottom: 8px;">R:R visé <span style="color:#5a5a6e; font-size:11px; text-transform:none;">(optionnel)</span></div>
          <input type="number" class="ts-setup-input" id="tsRrVise" step="0.1" min="0" placeholder="Ex: 3.0" style="width:100%; box-sizing:border-box;">
        </div>
        <button class="ts-btn-open" id="tsBtnOpen">Ouvrir TradeSpotter →</button>
        <div class="ts-cancel">
          <button class="ts-btn-back">← Retour</button>
        </div>
      </div>
    `;

    const input  = overlay.querySelector('#tsSetupInput');
    const list   = overlay.querySelector('#tsSetupList');
    const toggle = overlay.querySelector('#tsComboToggle');

    function renderList(setups) {
      if (!setups.length) {
        list.innerHTML = '<div class="ts-combobox-empty">Aucun setup — tapez pour en créer un</div>';
      } else {
        list.innerHTML = setups.map(s => `<div class="ts-combobox-item">${s}</div>`).join('');
      }
    }

    // Sélection d'un item
    list.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.ts-combobox-item');
      if (item) {
        input.value = item.textContent;
        list.classList.remove('ts-open');
      }
    });

    // Bouton ▾ toggle
    toggle.addEventListener('click', () => {
      if (list.classList.contains('ts-open')) {
        list.classList.remove('ts-open');
      } else {
        renderList(savedSetups);
        list.classList.add('ts-open');
        input.focus();
      }
    });

    // Ouvre au focus
    input.addEventListener('focus', () => {
      const q = input.value.toLowerCase();
      renderList(q ? savedSetups.filter(s => s.toLowerCase().includes(q)) : savedSetups);
      list.classList.add('ts-open');
    });

    // Filtre en tapant
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      renderList(q ? savedSetups.filter(s => s.toLowerCase().includes(q)) : savedSetups);
      list.classList.add('ts-open');
    });

    // Ferme en cliquant ailleurs
    document.addEventListener('click', function closeList(e) {
      if (!overlay.querySelector('#tsSetupCombo').contains(e.target)) {
        list.classList.remove('ts-open');
        document.removeEventListener('click', closeList);
      }
    });

    // Confirmer
    overlay.querySelector('#tsBtnOpen').addEventListener('click', () => {
      const setup = input.value.trim();
      const rrVise = overlay.querySelector('#tsRrVise')?.value.trim() || null;
      // Mémoriser le setup dans localStorage pour la prochaine fois
      if (setup && !savedSetups.includes(setup)) {
        savedSetups.push(setup);
        savedSetups.sort();
        localStorage.setItem('ts_setups', JSON.stringify(savedSetups));
      }
      openTradeSpotter(setup, rrVise);
    });

    overlay.querySelector('.ts-btn-back').addEventListener('click', showStep2);
  }

  function openTradeSpotter(setup = null, rrVise = null) {
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

    if (setup) params.set('setup', setup);
    if (rrVise) params.set('rrVise', rrVise);

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
