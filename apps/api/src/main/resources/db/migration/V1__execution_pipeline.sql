CREATE TABLE projects (
    id uuid PRIMARY KEY,
    name varchar(120) NOT NULL CHECK (length(trim(name)) > 0),
    description varchar(2000),
    base_url varchar(2048) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE TABLE test_runs (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    requested_url varchar(2048) NOT NULL,
    status varchar(16) NOT NULL CHECK (status IN ('QUEUED','RUNNING','PASSED','FAILED','ERROR','CANCELLED')),
    started_at timestamptz,
    completed_at timestamptz,
    duration_ms bigint CHECK (duration_ms >= 0),
    error_message varchar(4000),
    attempt_id uuid,
    claim_token uuid,
    lease_expires_at timestamptz,
    deadline_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CHECK (status <> 'RUNNING' OR (attempt_id IS NOT NULL AND claim_token IS NOT NULL AND lease_expires_at IS NOT NULL AND started_at IS NOT NULL)),
    CHECK ((status IN ('QUEUED','RUNNING')) = (completed_at IS NULL))
);
CREATE INDEX runs_project_created ON test_runs(project_id, created_at DESC, id);
CREATE INDEX runs_created ON test_runs(created_at DESC, id);
CREATE INDEX runs_queue ON test_runs(created_at, id) WHERE status = 'QUEUED';
CREATE INDEX runs_expired ON test_runs(lease_expires_at) WHERE status = 'RUNNING';
CREATE TABLE test_results (
    id uuid PRIMARY KEY,
    test_run_id uuid NOT NULL UNIQUE REFERENCES test_runs(id) ON DELETE RESTRICT,
    requested_url varchar(2048) NOT NULL,
    final_url varchar(4000),
    page_title varchar(4000),
    http_status_code integer CHECK (http_status_code BETWEEN 100 AND 599),
    console_errors jsonb NOT NULL CHECK (jsonb_typeof(console_errors) = 'array'),
    page_errors jsonb NOT NULL CHECK (jsonb_typeof(page_errors) = 'array'),
    failed_requests jsonb NOT NULL CHECK (jsonb_typeof(failed_requests) = 'array'),
    execution_errors jsonb NOT NULL CHECK (jsonb_typeof(execution_errors) = 'array'),
    screenshot_path varchar(200),
    execution_duration_ms bigint NOT NULL CHECK (execution_duration_ms >= 0),
    dropped_evidence_count integer NOT NULL CHECK (dropped_evidence_count >= 0),
    created_at timestamptz NOT NULL
);
