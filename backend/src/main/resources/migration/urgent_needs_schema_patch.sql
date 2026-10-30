-- ============================================================================
-- DonateConnect: Safe Additive Migration for Urgent NGO Requirements
-- Target: Neon PostgreSQL (Production)
-- Purpose: Add missing status column to ngo_urgent_needs, backfill existing records,
--          ensure default values and foreign keys, create performance indexes.
-- ============================================================================

-- 1. Add status column to ngo_urgent_needs with default 'ACTIVE'
-- Specifying DEFAULT 'ACTIVE' allows PostgreSQL to safely add the NOT NULL
-- column even when the table already contains existing records.
ALTER TABLE ngo_urgent_needs 
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;

-- 2. Backfill existing records: transition inactive ones to COMPLETED
UPDATE ngo_urgent_needs 
    SET status = 'COMPLETED' 
    WHERE active = false AND status = 'ACTIVE';

-- 3. Ensure fulfilled_quantity column exists and has 0 as default
ALTER TABLE ngo_urgent_needs 
    ADD COLUMN IF NOT EXISTS fulfilled_quantity INTEGER DEFAULT 0 NOT NULL;

UPDATE ngo_urgent_needs 
    SET fulfilled_quantity = 0 
    WHERE fulfilled_quantity IS NULL;

-- 4. Ensure completed_at column exists
ALTER TABLE ngo_urgent_needs 
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;

-- 5. Ensure donations table has quantity column
ALTER TABLE donations 
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 NOT NULL;

UPDATE donations 
    SET quantity = 1 
    WHERE quantity IS NULL OR quantity = 0;

-- 6. Ensure donations table has urgent_need_id foreign key column
ALTER TABLE donations 
    ADD COLUMN IF NOT EXISTS urgent_need_id UUID;

-- 7. Ensure foreign key constraint from donations to ngo_urgent_needs exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_donations_urgent_need'
    ) THEN
        ALTER TABLE donations
            ADD CONSTRAINT fk_donations_urgent_need
            FOREIGN KEY (urgent_need_id) REFERENCES ngo_urgent_needs(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 8. Add performance indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_urgent_needs_status ON ngo_urgent_needs(status);
CREATE INDEX IF NOT EXISTS idx_urgent_needs_active ON ngo_urgent_needs(active);
CREATE INDEX IF NOT EXISTS idx_donations_urgent_need ON donations(urgent_need_id);

