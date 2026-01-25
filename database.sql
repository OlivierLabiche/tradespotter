-- TradeSpotter - Database Schema
-- À exécuter dans Supabase SQL Editor

-- Table des trades
CREATE TABLE trades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Identification
    asset           VARCHAR(20) NOT NULL,
    direction       VARCHAR(10) NOT NULL,
    trade_date      DATE NOT NULL,
    trade_time      TIME NOT NULL,
    session         VARCHAR(20),
    mode            VARCHAR(20) DEFAULT 'live',
    mindset         VARCHAR(20),
    
    -- Timeframes
    tf_htf          VARCHAR(10),
    tf_ltf          VARCHAR(10),
    
    -- Checklist Liquidation HTF
    liq_htf         BOOLEAN DEFAULT FALSE,
    liq_htf_type    VARCHAR(10),
    liq_htf_force   VARCHAR(10),
    
    -- Checklist Liquidation LTF
    liq_ltf         BOOLEAN DEFAULT FALSE,
    liq_ltf_type    VARCHAR(10),
    liq_ltf_force   VARCHAR(10),
    
    -- Checklist BOS
    bos             BOOLEAN DEFAULT FALSE,
    bos_avant_cloture VARCHAR(10),
    bos_meche_corps VARCHAR(10),
    bos_liquidite   VARCHAR(10),
    
    -- Checklist Objectif
    objectif        BOOLEAN DEFAULT FALSE,
    objectif_type   VARCHAR(10),
    
    -- Scoring (1-5)
    score_liq_htf   INTEGER,
    score_liq_ltf   INTEGER,
    score_bos       INTEGER,
    score_objectif  INTEGER,
    score_avg       DECIMAL(3,1),
    
    -- Résultat
    status          VARCHAR(20) DEFAULT 'encours',
    potentiel_r     DECIMAL(5,2),
    r_obtenu        DECIMAL(5,2),
    
    -- Notes
    notes_entry     TEXT,
    notes_exit      TEXT,
    
    -- Images (URLs Supabase Storage)
    img_entry       TEXT,
    img_context     TEXT,
    img_exit        TEXT,
    
    -- Meta
    is_complete     BOOLEAN DEFAULT FALSE
);

-- Index pour performance
CREATE INDEX idx_trades_date ON trades(trade_date DESC);
CREATE INDEX idx_trades_asset ON trades(asset);
CREATE INDEX idx_trades_status ON trades(status);

-- Fonction pour update automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_updated_at
    BEFORE UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) - Désactivé pour simplifier (single user)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre tout (single user, pas d'auth complexe)
CREATE POLICY "Allow all operations" ON trades
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Storage bucket pour les images
-- À créer manuellement dans Supabase Dashboard : Storage > New Bucket > "screenshots" (public)
