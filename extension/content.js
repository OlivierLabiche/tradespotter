// TradeSpotter Extension - Content Script
// Injecté automatiquement sur TradingView

console.log('TradeSpotter: Content script chargé');

// Fonction pour extraire les données du graphique TradingView
function getChartData() {
  const data = {
    asset: '',
    timeframe: '',
    exchange: ''
  };
  
  // === EXTRACTION DU SYMBOLE ===
  
  // Méthode 1: Header du graphique (la plus fiable)
  const symbolSelectors = [
    '[data-symbol-short]',
    '.chart-controls-bar .apply-common-tooltip.accessible-text',
    '.tv-symbol-header__first-row .js-symbol-text',
    '#header-toolbar-symbol-search > div',
    '.chart-widget-header .symbol-info',
    '[class*="headerWrapper"] [class*="title"]'
  ];
  
  for (const selector of symbolSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.getAttribute('data-symbol-short') || el.textContent.trim();
      if (text && text.length > 0 && text.length < 20) {
        data.asset = text.replace(/[^A-Z0-9.]/gi, '');
        break;
      }
    }
  }
  
  // Méthode 2: Depuis le titre de la page
  if (!data.asset) {
    const titleMatch = document.title.match(/^([A-Z0-9.]+)/i);
    if (titleMatch) {
      data.asset = titleMatch[1];
    }
  }
  
  // === EXTRACTION DU TIMEFRAME ===
  
  const tfSelectors = [
    '[data-name="date-ranges-menu"] [class*="inner"]',
    '.chart-controls-bar button[class*="interval"]',
    '[class*="dateRangeControls"] button',
    '[id*="interval"] button'
  ];
  
  for (const selector of tfSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      if (text && /^[0-9]*[smhDWM]?$/i.test(text)) {
        data.timeframe = text;
        break;
      }
    }
  }
  
  return data;
}

// Exposer la fonction pour le background script
window.tradeSpotterGetData = getChartData;

// Écouter les messages du background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getChartData') {
    const data = getChartData();
    sendResponse(data);
  }
  return true;
});
