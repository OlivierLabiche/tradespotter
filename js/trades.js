// TradeSpotter - Trades Module

// Créer un trade
async function createTrade(trade) {
    const { data, error } = await supabaseClient
        .from('trades')
        .insert([trade])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Récupérer tous les trades
async function getTrades(filters = {}) {
    let query = supabaseClient
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false })
        .order('trade_time', { ascending: false });
    
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.asset) query = query.eq('asset', filters.asset);
    if (filters.mindset) query = query.eq('mindset', filters.mindset);
    if (filters.is_complete !== undefined) query = query.eq('is_complete', filters.is_complete);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// Récupérer un trade par ID
async function getTrade(id) {
    const { data, error } = await supabaseClient
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

// Mettre à jour un trade
async function updateTrade(id, updates) {
    updates.is_complete = !!(
        updates.direction &&
        updates.status &&
        updates.status !== 'encours' &&
        updates.r_obtenu !== null &&
        updates.r_obtenu !== undefined
    );
    
    const { data, error } = await supabaseClient
        .from('trades')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Supprimer un trade
async function deleteTrade(id) {
    const { error } = await supabaseClient
        .from('trades')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return true;
}

// Calculer les statistiques
async function getStats() {
    const { data: trades, error } = await supabaseClient
        .from('trades')
        .select('status, r_obtenu, mindset, is_complete');

    if (error) throw error;

    // Trades clôturés = tous ceux avec un statut final (peu importe si R est renseigné)
    const closed = trades.filter(t => t.status && t.status !== 'encours');
    const wins = closed.filter(t => t.status === 'tp' || t.status === 'positif');
    const losses = closed.filter(t => t.status === 'sl');
    const be = closed.filter(t => t.status === 'be');
    const encours = trades.filter(t => t.status === 'encours');

    // Total R : r_obtenu explicite si renseigné, sinon SL = -1 par défaut, autres ignorés
    const totalR = closed.reduce((sum, t) => {
        if (t.r_obtenu !== null && t.r_obtenu !== undefined) return sum + t.r_obtenu;
        if (t.status === 'sl') return sum - 1;
        return sum;
    }, 0);

    // Win rate sans les BE (neutre, ne compte ni comme win ni comme loss)
    const closedNoBE = closed.filter(t => t.status !== 'be');
    const winRate = closedNoBE.length > 0 ? (wins.length / closedNoBE.length * 100) : 0;

    return {
        total: trades.length,
        closed: closed.length,
        wins: wins.length,
        losses: losses.length,
        be: be.length,
        encours: encours.length,
        totalR: totalR.toFixed(1),
        winRate: winRate.toFixed(0)
    };
}

// Récupérer les setups uniques
async function getSetups() {
    const { data, error } = await supabaseClient
        .from('trades')
        .select('setup')
        .not('setup', 'is', null)
        .neq('setup', '');

    if (error) throw error;
    return [...new Set(data.map(t => t.setup).filter(Boolean))].sort();
}

// Récupérer les assets uniques
async function getAssets() {
    const { data, error } = await supabaseClient
        .from('trades')
        .select('asset')
        .order('asset');
    
    if (error) throw error;
    return [...new Set(data.map(t => t.asset))];
}
