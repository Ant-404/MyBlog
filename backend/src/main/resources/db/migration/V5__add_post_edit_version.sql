-- Reject stale edits rather than silently overwrite changes from another editor tab.
ALTER TABLE posts ADD COLUMN version INT NOT NULL DEFAULT 0;
CREATE INDEX idx_posts_admin_updated ON posts(updated_at, id);
