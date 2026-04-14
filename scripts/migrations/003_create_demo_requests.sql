CREATE TABLE IF NOT EXISTS demo_requests (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    work_email VARCHAR(255) UNIQUE NOT NULL,
    job_title VARCHAR(255),
    company_size VARCHAR(50),
    modules_requested TEXT[],
    current_tools TEXT,
    discovery_source VARCHAR(100),
    message TEXT,
    status VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_demo_email ON demo_requests(work_email);
