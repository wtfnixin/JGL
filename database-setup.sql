-- Teams participating in the event
CREATE TABLE teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  code         TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- One score row per team. Entire scoring state lives here.
CREATE TABLE scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  audience_score   INTEGER DEFAULT 0,
  total_score      INTEGER DEFAULT 0,
  bonus_awarded    BOOLEAN DEFAULT FALSE,
  bonus_label      TEXT DEFAULT NULL,
  guess_submitted  BOOLEAN DEFAULT FALSE,
  guess_value      INTEGER DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- One row per vote. Unique pair prevents double voting at DB level.
CREATE TABLE votes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performing_team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  voting_team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  points_given         INTEGER NOT NULL CHECK (points_given BETWEEN 1 AND 10),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(performing_team_id, voting_team_id)
);

-- Singleton row. Always exactly one row with id = 1. Controls the whole event.
CREATE TABLE game_state (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  current_team_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  phase             TEXT DEFAULT 'waiting'
                    CHECK (phase IN ('waiting', 'voting_open', 'voting_closed', 'results')),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the singleton immediately after creating the table. Never insert again.
INSERT INTO game_state (id) VALUES (1);

CREATE OR REPLACE FUNCTION sync_total_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_score := NEW.audience_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_total_score
BEFORE UPDATE OF audience_score ON scores
FOR EACH ROW EXECUTE FUNCTION sync_total_score();

ALTER TABLE teams      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read teams"      ON teams      FOR SELECT USING (true);
CREATE POLICY "public read scores"     ON scores     FOR SELECT USING (true);
CREATE POLICY "public read game_state" ON game_state FOR SELECT USING (true);
