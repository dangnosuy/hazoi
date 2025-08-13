-- Thêm bảng FEEDBACK để lưu trữ phản ánh của người dân
CREATE TABLE FEEDBACK (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    content TEXT NOT NULL,
    feedback_types JSON NOT NULL,
    anonymous BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'processing', 'resolved', 'rejected') DEFAULT 'pending',
    admin_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tracking_code (tracking_code),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Bảng lưu trữ file đính kèm của feedback
CREATE TABLE FEEDBACK_ATTACHMENTS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feedback_id) REFERENCES FEEDBACK(id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id)
);