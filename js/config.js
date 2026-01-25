// TradeSpotter - Supabase Configuration

const SUPABASE_URL = 'https://fnuuztwzuxeulzlihaok.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudXV6dHd6dXhldWx6bGloYW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjE5MDYsImV4cCI6MjA4NDkzNzkwNn0.zRsJH8I3ZE3sZGQZcrVjAmmOTKlRiXd6at8wvpKF1B8';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper pour vérifier la connexion
async function checkConnection() {
    try {
        const { data, error } = await supabaseClient.from('trades').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase connecté');
        return true;
    } catch (error) {
        console.error('❌ Erreur Supabase:', error.message);
        return false;
    }
}
