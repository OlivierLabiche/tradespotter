// TradeSpotter - Supabase Configuration

const SUPABASE_URL = 'https://fnuuztwzuxeulzlihaok.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DLec8pZcZfuqSO2LgIil3w_RkCVJd6l';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper pour vérifier la connexion
async function checkConnection() {
    try {
        const { data, error } = await supabase.from('trades').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase connecté');
        return true;
    } catch (error) {
        console.error('❌ Erreur Supabase:', error.message);
        return false;
    }
}
