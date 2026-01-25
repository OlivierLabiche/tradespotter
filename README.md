# TradeSpotter

Journal de trading ICT avec base de données SQL et stockage d'images.

## 🚀 Setup

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com)
2. Crée un nouveau projet
3. Note le **Project URL** et la **anon public key**

### 2. Créer la base de données

1. Dans Supabase, va dans **SQL Editor**
2. Colle le contenu de `database.sql`
3. Exécute

### 3. Créer le bucket Storage

1. Dans Supabase, va dans **Storage**
2. Clique **New Bucket**
3. Nom : `screenshots`
4. **Public bucket** : ✅ Activé
5. Crée

### 4. Configurer l'application

1. Ouvre `js/config.js`
2. Remplace `SUPABASE_URL` par ton URL
3. Remplace `SUPABASE_ANON_KEY` par ta clé

### 5. Déployer sur Netlify

1. Crée un repo GitHub avec ces fichiers
2. Va sur [netlify.com](https://netlify.com)
3. **New site from Git**
4. Connecte ton repo
5. Deploy !

## 📁 Structure

```
tradespotter/
├── index.html      # Dashboard / Liste
├── trade.html      # Formulaire trade
├── css/
│   └── style.css   # Styles
├── js/
│   ├── config.js   # Config Supabase
│   ├── trades.js   # CRUD trades
│   └── images.js   # Upload images
└── database.sql    # Schema SQL
```

## 🔧 Extension Chrome (optionnel)

L'extension Trade Log peut envoyer les trades directement à l'API.
Voir le dossier `extension/` pour la configuration.

## 📊 Export

- **JSON** : Bouton Export dans l'interface
- **SQL** : Accès direct via Supabase Dashboard

## 🔒 Sécurité

- Pas d'authentification (single user)
- RLS activé mais ouvert
- Pour sécuriser : ajouter Supabase Auth
