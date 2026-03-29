// Brain-inspired memory migrations
// Adds columns for ACT-R activation, associations, and memory tiers

import type { Database } from "bun:sqlite";

export const migration018: Migration = {
  version: 18,
  up: (db: Database) => {
    // Add brain-inspired columns to observations table
    db.run(`
      ALTER TABLE observations ADD COLUMN tier TEXT DEFAULT 'episodic';
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN importance REAL DEFAULT 0.5;
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN base_activation REAL DEFAULT 0;
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN decay_rate REAL DEFAULT 0.5;
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN tags TEXT DEFAULT '[]';
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN associations TEXT DEFAULT '[]';
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN last_accessed INTEGER;
    `);

    db.run(`
      ALTER TABLE observations ADD COLUMN access_count INTEGER DEFAULT 0;
    `);

    // Create index for activation-based retrieval
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_observations_activation ON observations(base_activation DESC);
    `);

    // Create index for tier-based queries
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_observations_tier ON observations(tier);
    `);

    console.log("✅ Added brain-inspired memory columns to observations");
  },

  down: (db: Database) => {
    db.run(`DROP INDEX IF EXISTS idx_observations_activation`);
    db.run(`DROP INDEX IF EXISTS idx_observations_tier`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS tier`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS importance`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS base_activation`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS decay_rate`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS tags`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS associations`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS last_accessed`);
    db.run(`ALTER TABLE observations DROP COLUMN IF EXISTS access_count`);

    console.log("✅ Removed brain-inspired memory columns from observations");
  },
};

export interface Migration {
  version: number;
  up: (db: Database) => void;
  down?: (db: Database) => void;
}
