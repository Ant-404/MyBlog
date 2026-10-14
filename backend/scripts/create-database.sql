-- Run once with an account allowed to create databases.
-- Application migrations only operate inside this dedicated database.
CREATE DATABASE IF NOT EXISTS MyBlog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Create a local application user separately with your own password, then grant:
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
-- ON MyBlog.* TO 'myblog'@'localhost';
