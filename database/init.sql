-- Runs once on first container init (empty data dir).
CREATE DATABASE IF NOT EXISTS mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mydb;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- app_user is created by MYSQL_USER env var; grant it access explicitly.
GRANT ALL PRIVILEGES ON mydb.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
