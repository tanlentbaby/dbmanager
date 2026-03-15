-- 示例 SQL 文件 - 用户管理

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入示例数据
INSERT INTO users (username, email, password_hash) VALUES
    ('admin', 'admin@example.com', 'hash_placeholder_1'),
    ('user1', 'user1@example.com', 'hash_placeholder_2'),
    ('user2', 'user2@example.com', 'hash_placeholder_3');

-- 查询所有用户
SELECT id, username, email, status, created_at
FROM users
ORDER BY created_at DESC;

-- 查询活跃用户
SELECT COUNT(*) as active_count
FROM users
WHERE status = 'active';
