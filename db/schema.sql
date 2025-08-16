-- Tạo database
CREATE DATABASE IF NOT EXISTS buonlanghieuluat;
USE buonlanghieuluat;

-- USERS: Đăng ký bằng Google
CREATE TABLE USERS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    birthday DATE NOT NULL,
    education_level VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    hashed_password VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    signin_google BOOLEAN DEFAULT FALSE,
    role ENUM('user','admin') DEFAULT 'user', 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE WHITELIST (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jti VARCHAR(64),
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
);

-- PROCESS_ACCESS: Ghi nhận lượt truy cập
CREATE TABLE PROCESS_ACCESS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- HISTORY_AI_CHAT: Lưu lịch sử chat AI
CREATE TABLE HISTORY (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    question TEXT,
    answer TEXT,
    token CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES USERS(email) ON DELETE CASCADE
);

CREATE TABLE LESSON (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    token CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE VIDEO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_lesson INT NOT NULL,
    url_video VARCHAR(255), 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lesson) REFERENCES LESSON(id) ON DELETE CASCADE
);

CREATE TABLE QUESTION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_lesson INT NOT NULL,
    question TEXT NOT NULL,
    ans_1 TEXT NOT NULL,
    ans_2 TEXT NOT NULL,
    ans_3 TEXT NOT NULL,
    ans_4 TEXT NOT NULL,
    right_ans CHAR(1) NOT NULL CHECK (right_ans IN ('A','B','C','D')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lesson) REFERENCES LESSON(id) ON DELETE CASCADE
);

-- USER_LEARNING: Tiến độ học của người dùng
CREATE TABLE USER_LEARNING (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    id_lesson INT,
    score FLOAT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES USERS(email) ON DELETE CASCADE,
    FOREIGN KEY (id_lesson) REFERENCES LESSON(id) ON DELETE CASCADE
);

-- ARTICLE: Quản lý bài viết
CREATE TABLE ARTICLE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    topic VARCHAR(255),
    token CHAR(36),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Luu tru ma so OTP de kiem tra
CREATE TABLE OTP (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    birthday DATE NOT NULL,
    education_level VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    role VARCHAR(10),
    hashed_password VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL,
    otp INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE RESETPASSWORD (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(64) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

INSERT INTO USERS (fullname, birthday, education_level, location, hashed_password, email, signin_google, role)
VALUES ('Trong Dang', '2005-04-27', 'Đại học', 'CưMgar-DakLak', '$2b$10$v3eoCYj4V6XY7y7n6CuY5.6M5oERJLdDJCJs8kaySPTg6e4ninxXq', 'honguyentrongdang79@gmail.com', 0, 'admin');
