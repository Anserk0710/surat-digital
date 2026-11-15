-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "supabase_user_id" UUID NOT NULL,
    "supabase_session_id" UUID NOT NULL,
    "session_token_hash" CHAR(64) NOT NULL,
    "access_token_ciphertext" TEXT NOT NULL,
    "refresh_token_ciphertext" TEXT NOT NULL,
    "access_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_supabase_session_id_key" ON "auth_sessions"("supabase_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_session_token_hash_key" ON "auth_sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_employee_id_idx" ON "auth_sessions"("employee_id");

-- CreateIndex
CREATE INDEX "auth_sessions_supabase_user_id_idx" ON "auth_sessions"("supabase_user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_revoked_at_expires_at_idx" ON "auth_sessions"("revoked_at", "expires_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

