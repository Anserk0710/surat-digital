ALTER TABLE public."auth_sessions"
  ADD COLUMN "refresh_lease_id" UUID,
  ADD COLUMN "refresh_lease_until" TIMESTAMPTZ(6);
