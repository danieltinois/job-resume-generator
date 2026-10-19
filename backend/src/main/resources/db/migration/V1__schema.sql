-- Accounts. A user may sign in with a password, with Google, or both.
CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email          text NOT NULL UNIQUE,
    password_hash  text,
    google_sub     text UNIQUE,
    name           text NOT NULL,
    email_verified boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Single-use tokens. Only a SHA-256 hash of the token is stored. Refresh
-- tokens of one login share a family, so reuse can revoke the whole chain.
CREATE TABLE auth_tokens (
    token_hash text PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    type       text NOT NULL CHECK (type IN ('VERIFY_EMAIL', 'RESET_PASSWORD', 'REFRESH')),
    family     uuid,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_family ON auth_tokens (family);
CREATE INDEX auth_tokens_user ON auth_tokens (user_id, type);

-- One profile document per user; version gives optimistic locking.
CREATE TABLE profiles (
    user_id    uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
    data       jsonb NOT NULL,
    version    int NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    title       text,
    company     text,
    description text NOT NULL,
    language    text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_user_created ON jobs (user_id, created_at DESC);

-- A generated resume: the user's selection plus the frozen document that was
-- rendered, so an old resume renders the same after the profile changes.
CREATE TABLE resumes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    job_id     uuid NOT NULL REFERENCES jobs ON DELETE CASCADE,
    language   text NOT NULL,
    selection  jsonb NOT NULL,
    snapshot   jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resumes_user_job ON resumes (user_id, job_id);

CREATE TABLE tech_terms (
    id        serial PRIMARY KEY,
    canonical text NOT NULL UNIQUE,
    aliases   text[] NOT NULL DEFAULT '{}'
);
