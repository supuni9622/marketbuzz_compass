-- Add ONHOLD to charge_status enum for Clover "On Hold" status.
-- ONHOLD = billed but not yet moved to COLLECTED/DEPOSITED; needed for tracking and future calculations.
ALTER TYPE charge_status ADD VALUE 'ONHOLD';
