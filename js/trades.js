// TradeSpotter - Trades Module

// Créer un trade
async function createTrade(trade) {
    const { data, error } = await supabase
        .from('trades')
        .insert([trade])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Récupérer tous les trades
async function getTrades(filters = {}) {
    let query = supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false })
        .order('trade_time', { ascending: false });
    
    // Filtres optionnels
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.asset) {
        query = query.eq('asset', filters.asset);
    }
    if (filters.mindset) {
        query = query.eq('mindset', filters.mindset);
    }
    if (filters.is_complete !== undefined) {
        query = query.eq('is_complete', filters.is_complete);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// Récupérer un trade par ID
async function getTrade(id) {
    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

// Mettre à jour un trade
async function updateTrade(id, updates) {
    // Calculer is_complete
    updates.is_complete = !!(
        updates.direction &&
        updates.status &&
        updates.status !== 'encours' &&
        updates.potentiel_r
    );
    
    const { data, error } = await supabase
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
    const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return true;
}

// Calculer les statistiques
async function getStats() {
    const { data: trades, error } = await supabase
        .from('trades')
        .select('status, r_obtenu, mindset, is_complete');
    
    if (error) throw error;
    
    const completed = trades.filter(t => t.is_complete);
    const wins = completed.filter(t => t.status === 'tp' || t.status === 'positif');
    const losses = completed.filter(t => t.status === 'sl');
    const encours = trades.filter(t => t.status === 'encours');
    
    const totalR = completed.reduce((sum, t) => sum + (t.r_obtenu || 0), 0);
    const winRate = completed.length > 0 ? (wins.length / completed.length * 100) : 0;
    
    // Stats par mindset
    const planTrades = completed.filter(t => t.mindset === 'plan');
    const intuitifTrades = completed.filter(t => t.mindset === 'intuitif');
    const planWinRate = planTrades.length > 0 
        ? (planTrades.filter(t => t.status === 'tp' || t.status === 'positif').length / planTrades.length * 100) 
        : 0;
    const intuitifWinRate = intuitifTrades.length > 0 
        ? (intuitifTrades.filter(t => t.status === 'tp' || t.status === 'positif').length / intuitifTrades.length * 100) 
        : 0;
    
    return {
        total: trades.length,
        completed: completed.length,
        wins: wins.length,
        losses: losses.length,
        encours: encours.length,
        totalR: totalR.toFixed(1),
        winRate: winRate.toFixed(0),
        planWinRate: planWinRate.toFixed(0),
        intuitifWinRate: intuitifWinRate.toFixed(0)
    };
}

// Récupérer les assets uniques (pour les filtres)
async function getAssets() {
    const { data, error } = await supabase
        .from('trades')
        .select('asset')
        .order('asset');
    
    if (error) throw error;
    
    // Dédupliquer
    return [...new Set(data.map(t => t.asset))];
}
