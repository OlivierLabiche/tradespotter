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
        updates.r_obtenu
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
    
    const completed = trades.filter(t => t.is_complete);
    const wins = completed.filter(t => t.status === 'tp' || t.status === 'positif');
    const losses = completed.filter(t => t.status === 'sl');
    const encours = trades.filter(t => t.status === 'encours');
    
    const totalR = completed.reduce((sum, t) => sum + (t.r_obtenu || 0), 0);
    const winRate = completed.length > 0 ? (wins.length / completed.length * 100) : 0;
    
    return {
        total: trades.length,
        completed: completed.length,
        wins: wins.length,
        losses: losses.length,
        encours: encours.length,
        totalR: totalR.toFixed(1),
        winRate: winRate.toFixed(0)
    };
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
