-- CreateTable
CREATE TABLE "auth_rate_limit_buckets" (
    "id" VARCHAR(64) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_rate_limit_buckets_expires_at_idx" ON "auth_rate_limit_buckets"("expires_at");

-- Explicit runtime privileges.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public."auth_rate_limit_buckets"
TO "surat_runtime";

-- Database-backed rate limiting must not be accessible
-- through the Supabase Data API.
REVOKE ALL
ON TABLE public."auth_rate_limit_buckets"
FROM anon, authenticated;

ALTER TABLE public."auth_rate_limit_buckets"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_rate_limit_runtime_all"
ON public."auth_rate_limit_buckets"
FOR ALL
TO "surat_runtime"
USING (true)
WITH CHECK (true);