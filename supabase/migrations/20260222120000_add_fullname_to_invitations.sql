-- Migration: add full_name to invitations
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name TEXT;
