// TradeSpotter - Images Module

const BUCKET_NAME = 'screenshots';

// Upload une image vers Supabase Storage
async function uploadImage(file, tradeId, type) {
    // type = 'entry' | 'context' | 'exit'
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${tradeId}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });
    
    if (error) throw error;
    
    // Récupérer l'URL publique
    const { data: urlData } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
    
    return urlData.publicUrl;
}

// Upload depuis le clipboard (Ctrl+V)
async function uploadFromClipboard(tradeId, type) {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            for (const mimeType of item.types) {
                if (mimeType.startsWith('image/')) {
                    const blob = await item.getType(mimeType);
                    const file = new File([blob], `clipboard.${mimeType.split('/')[1]}`, { type: mimeType });
                    return await uploadImage(file, tradeId, type);
                }
            }
        }
        throw new Error('Pas d\'image dans le presse-papier');
    } catch (error) {
        throw error;
    }
}

// Télécharger une image depuis une URL TradingView
async function downloadTradingViewImage(tvUrl) {
    // Convertir l'URL TradingView en URL d'image directe
    const match = tvUrl.match(/tradingview\.com\/x\/([A-Za-z0-9]+)/);
    if (!match) {
        // Si c'est déjà une URL d'image, la retourner
        if (tvUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            return tvUrl;
        }
        throw new Error('URL TradingView invalide');
    }
    
    const imageUrl = `https://s3.tradingview.com/snapshots/x/${match[1]}.png`;
    return imageUrl;
}

// Upload depuis une URL TradingView
async function uploadFromTradingView(tvUrl, tradeId, type) {
    const imageUrl = await downloadTradingViewImage(tvUrl);
    
    // Fetch l'image
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Impossible de télécharger l\'image');
    
    const blob = await response.blob();
    const file = new File([blob], `tv_${Date.now()}.png`, { type: 'image/png' });
    
    return await uploadImage(file, tradeId, type);
}

// Supprimer une image
async function deleteImage(imageUrl) {
    if (!imageUrl) return;
    
    // Extraire le nom du fichier de l'URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const { error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .remove([fileName]);
    
    if (error) console.error('Erreur suppression image:', error);
}

// Créer une zone de drop pour les images
function createDropZone(element, onUpload) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('dragover');
    });
    
    element.addEventListener('dragleave', () => {
        element.classList.remove('dragover');
    });
    
    element.addEventListener('drop', async (e) => {
        e.preventDefault();
        element.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            onUpload(files[0]);
        }
    });
    
    // Click pour sélectionner un fichier
    element.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                onUpload(e.target.files[0]);
            }
        };
        input.click();
    });
}

// Gérer le paste global (Ctrl+V)
function setupPasteHandler(targetElement, onPaste) {
    document.addEventListener('paste', async (e) => {
        // Vérifier si on est dans la zone cible
        if (!targetElement.contains(document.activeElement) && document.activeElement !== targetElement) {
            return;
        }
        
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                onPaste(blob);
                return;
            }
        }
    });
}
