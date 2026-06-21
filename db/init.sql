CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tasks (title, done) VALUES
    ('Set up Jenkins pipeline', TRUE),
    ('Push image to DockerHub', FALSE),
    ('Deploy to Minikube', FALSE)
ON CONFLICT DO NOTHING;
