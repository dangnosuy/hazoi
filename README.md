# BÁO CÁO CHI TIẾT WEBSITE "BUÔN LÀNG HIỂU LUẬT"
## Hướng Dẫn Xây Dựng và Triển Khai Trang Web Pháp Luật

---

# MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Các tính năng của trang web](#2-các-tính-năng-của-trang-web)
   - 2.1 [Đăng ký / Đăng nhập](#21-đăng-ký--đăng-nhập)
   - 2.2 [Chatbot AI hỗ trợ pháp luật](#22-chatbot-ai-hỗ-trợ-pháp-luật)
   - 2.3 [Học bài và làm Quiz](#23-học-bài-và-làm-quiz)
   - 2.4 [Gửi phản ánh / góp ý](#24-gửi-phản-ánh--góp-ý)
   - 2.5 [Quản lý hồ sơ người dùng](#25-quản-lý-hồ-sơ-người-dùng)
   - 2.6 [Trang Admin quản trị](#26-trang-admin-quản-trị)
3. [Hướng dẫn deploy lên VPS](#3-hướng-dẫn-deploy-lên-vps)
   - 3.1 [VPS là gì?](#31-vps-là-gì)
   - 3.2 [Các thành phần cần chuẩn bị trên VPS](#32-các-thành-phần-cần-chuẩn-bị-trên-vps)
   - 3.3 [Các bước triển khai](#33-các-bước-triển-khai)
4. [Hướng dẫn kết nối Domain](#4-hướng-dẫn-kết-nối-domain)
   - 4.1 [Domain là gì?](#41-domain-là-gì)
   - 4.2 [Mua domain tại Vietnix](#42-mua-domain-tại-vietnix)
   - 4.3 [Kết nối domain với VPS](#43-kết-nối-domain-với-vps)
5. [Kết luận](#5-kết-luận)

---

# 1. TỔNG QUAN DỰ ÁN

## 1.1 Giới thiệu
Website "Buôn Làng Hiểu Luật" là một nền tảng giáo dục pháp luật dành cho người dân, đặc biệt là đồng bào dân tộc thiểu số. Website cung cấp các tính năng:
- Tra cứu kiến thức pháp luật thông qua AI Chatbot
- Học bài qua video và làm quiz kiểm tra
- Gửi phản ánh, góp ý về các vấn đề pháp luật
- Quản lý thông tin cá nhân

## 1.2 Công nghệ sử dụng

| Phần | Công nghệ |
|------|-----------|
| **Frontend** | HTML, CSS, JavaScript (Vanilla JS) |
| **Backend** | Node.js + Express.js |
| **Database** | MySQL |
| **AI Integration** | OpenRouter API (DeepSeek AI model) |
| **Authentication** | JWT (JSON Web Token) |
| **Email Service** | Nodemailer + Gmail SMTP |

## 1.3 Cấu trúc thư mục dự án

```
project/
├── backend/
│   ├── app.js                    # Entry point của server
│   ├── db/
│   │   └── schema.sql            # Schema database
│   ├── routes/
│   │   ├── authentication.js     # API xác thực
│   │   ├── chatbot.js            # API chatbot AI
│   │   ├── video-and-game.js     # API bài học & quiz
│   │   ├── feedback.js           # API phản ánh
│   │   ├── user-profile.js       # API hồ sơ người dùng
│   │   ├── user-management.js    # API quản lý user (Admin)
│   │   └── requireRole.js        # Middleware phân quyền
│   └── uploads/                  # Thư mục lưu file upload
│
├── frontend/
│   ├── main/                     # Trang chủ
│   ├── auth/                     # Đăng nhập, đăng ký
│   ├── ai-chat/                  # Chatbot AI
│   ├── quiz/                     # Học và làm quiz
│   ├── feedback/                 # Gửi phản ánh
│   ├── profile/                  # Hồ sơ người dùng
│   ├── admin/                    # Trang quản trị
│   └── tin-tuc-phap-luat/        # Tin tức pháp luật
```

---

# 2. CÁC TÍNH NĂNG CỦA TRANG WEB

## 2.1 Đăng ký / Đăng nhập

### Mô tả chức năng
Người dùng có thể đăng ký tài khoản mới với các thông tin cá nhân và đăng nhập để sử dụng các tính năng của website. Hệ thống sử dụng JWT để xác thực và OTP để xác minh email.

### Backend - API Đăng ký (`/api/auth/register`)

```javascript
// File: backend/routes/authentication.js

router.post('/register', async (req, res) => {
    const { fullname, birthday, education_level, location, email, password } = req.body;

    // Kiểm tra đủ thông tin
    if (!fullname || !birthday || !education_level || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Không đủ thông tin đăng ký, vui lòng kiểm tra thông tin"
        });
    }

    // Kiểm tra độ mạnh mật khẩu
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu của bạn yếu, hãy thử mật khẩu khác...'
        });
    }

    try {
        // Check email tồn tại trong USERS
        const [rows] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Đã tồn tại người dùng sử dụng email này!'
            });
        }

        // Hash password
        const hashed_password = await bcrypt.hash(password, 10);

        // OTP + token
        const otp_number = Math.floor(Math.random() * 99999) + 10000;
        const verify_token = crypto.randomBytes(32).toString('hex');

        // Lưu vào bảng OTP tạm thời
        await SaveOTPToDB(fullname, birthday, education_level, location, 
                          email, hashed_password, verify_token, otp_number);

        // Gửi OTP qua email
        const success = await SendOTPToEmail(email, otp_number);
        if (success) {
            return res.status(200).json({
                success: true,
                message: 'Mã OTP đã được gửi về email của bạn!',
                token: verify_token
            });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
```

### Frontend - Gọi API Đăng ký

```javascript
// File: frontend/auth/script.js

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        fullname: document.getElementById('fullname').value,
        birthday: document.getElementById('birthday').value,
        education_level: document.getElementById('education').value,
        location: getLocationString(),
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Lưu token và chuyển sang trang xác minh OTP
            localStorage.setItem('verify_token', data.token);
            window.location.href = 'otp.html';
        } else {
            showNotification(data.message, false);
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', false);
    }
}
```

### Luồng hoạt động

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Người     │      │   Frontend  │      │   Backend   │      │   Database  │
│    dùng     │      │   (HTML/JS) │      │  (Node.js)  │      │   (MySQL)   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │  1. Nhập thông tin │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ 2. POST /register  │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │ 3. Check email     │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │ 4. Save OTP        │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │ 5. Gửi email OTP   │
       │                    │                    │─────────┐          │
       │                    │                    │         │          │
       │  6. Nhận OTP email │                    │<────────┘          │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  7. Nhập OTP       │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ 8. POST /verify-otp│                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │ 9. Insert USERS    │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │  10. Đăng ký OK!   │<────────────────── │                    │
       │<───────────────────│                    │                    │
```

---

## 2.2 Chatbot AI Hỗ Trợ Pháp Luật

### Mô tả chức năng
Người dùng có thể đặt câu hỏi về pháp luật Việt Nam và nhận câu trả lời từ AI. Hệ thống lưu lại lịch sử chat để người dùng có thể xem lại sau.

### Backend - API Chat với AI

```javascript
// File: backend/routes/chatbot.js

// Prompt hệ thống để AI hiểu ngữ cảnh
const constant_prompt = 'Bạn là một trợ lý ảo AI phục vụ cho tôi về các vấn đề ' +
                        'về pháp luật Việt Nam cụ thể hơn là cho dân tộc thiểu số. ' +
                        'Hãy cố gắng trả lời hết các câu hỏi bằng tiếng Việt!';

// Hàm gọi AI API (OpenRouter)
async function CallAI(prompt) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "deepseek/deepseek-r1:free",
                messages: [{ role: "user", content: prompt }]
            },
            {
                headers: {
                    'Authorization': 'Bearer sk-or-v1-xxx...', // API Key
                    'Content-Type': 'application/json',
                }
            }
        );
        return response;
    } catch (error) {
        console.error("Error calling OpenRouter API:", error);
        return null;
    }
}

// API gửi câu hỏi mới (tạo cuộc hội thoại mới)
router.post('/post/question', requireRole('user', 'admin'), async (req, res) => {
    const { question } = req.body;
    const email = req.userPayload.sub;
    const token = uuidv4();  // Tạo token mới cho cuộc hội thoại

    try {
        const prompt = constant_prompt + question;
        const response = await CallAI(prompt);
        const answer = response.data.choices[0].message.content;
        
        // Lưu vào database
        await db.query(
            'INSERT INTO HISTORY (email, question, answer, token) VALUES (?, ?, ?, ?)',
            [email, question, answer, token]
        );
        
        res.status(200).json({
            success: true,
            answer: answer,
            token: token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error in get answer' });
    }
});

// API lấy lịch sử chat
router.get('/get/title/history/', requireRole('user', 'admin'), async (req, res) => {
    const email = req.userPayload.sub;
    
    try {
        const [result] = await db.query(`
            SELECT h.token, h.question, h.answer, h.updated_at
            FROM HISTORY h
            INNER JOIN (
                SELECT token, MAX(updated_at) AS max_updated
                FROM HISTORY WHERE email = ? GROUP BY token
            ) latest ON h.token = latest.token AND h.updated_at = latest.max_updated
            WHERE h.email = ?
            ORDER BY h.updated_at DESC
        `, [email, email]);
        
        res.status(200).json({ success: true, history: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error in get history' });
    }
});
```

### Frontend - Giao diện Chat

```javascript
// File: frontend/ai-chat/script.js

// Gửi câu hỏi đến AI
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;
    
    // Hiển thị câu hỏi của người dùng
    addMessageToChat(message, 'user');
    input.value = '';
    
    // Hiển thị loading
    showTypingIndicator();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:5001/api/chatbot/post/question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ question: message })
        });
        
        const data = await response.json();
        hideTypingIndicator();
        
        if (data.success) {
            // Hiển thị câu trả lời từ AI
            addMessageToChat(data.answer, 'bot');
            // Lưu token cuộc hội thoại
            currentChatToken = data.token;
        }
    } catch (error) {
        hideTypingIndicator();
        addMessageToChat('Có lỗi xảy ra, vui lòng thử lại!', 'error');
    }
}

// Thêm tin nhắn vào khung chat
function addMessageToChat(message, type) {
    const chatContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.innerHTML = formatMessage(message);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
```

### Cấu trúc Database lưu lịch sử chat

```sql
-- File: backend/db/schema.sql

CREATE TABLE HISTORY (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),                          -- Email người dùng
    question TEXT,                               -- Câu hỏi
    answer TEXT,                                 -- Câu trả lời từ AI
    token CHAR(36),                              -- Token phiên chat (UUID)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES USERS(email) ON DELETE CASCADE
);
```

---

## 2.3 Học Bài và Làm Quiz

### Mô tả chức năng
Người dùng có thể xem video bài học về pháp luật và làm bài quiz để kiểm tra kiến thức. Điểm số sẽ được lưu lại để theo dõi tiến độ học tập.

### Backend - API Lấy danh sách bài học

```javascript
// File: backend/routes/video-and-game.js

// Lấy danh sách tất cả bài học
router.get('/get-token-lesson', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                l.token, 
                l.name, 
                l.topic,
                v.url_video
            FROM LESSON l
            LEFT JOIN VIDEO v ON l.id = v.id_lesson
        `);

        res.status(200).json({
            success: true,
            num_lesson: rows.length,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi lấy bài học!" });
    }
});

// Lấy câu hỏi quiz theo bài học
router.post('/get-question', requireRole('user', 'admin'), async (req, res) => {
    const { token } = req.body;

    try {
        const [list_question] = await db.query(`
            SELECT question, ans_1, ans_2, ans_3, ans_4, right_ans 
            FROM QUESTION
            WHERE id_lesson = (SELECT id FROM LESSON WHERE token = ?)
        `, [token]);
        
        if (list_question.length <= 0) {
            return res.status(200).json({
                success: false,
                message: "Không có câu hỏi cho bài học này!"
            });
        }
        
        return res.status(200).json({
            success: true,
            questions: list_question,
            token: token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi lấy câu hỏi!" });
    }
});

// Nộp bài và tính điểm
router.post('/submit-answer', requireRole('user', 'admin'), async (req, res) => {
    const { token, user_ans } = req.body;
    const email = req.userPayload.sub;

    try {
        // Lấy đáp án đúng từ database
        const [list_answer] = await db.query(`
            SELECT right_ans FROM QUESTION
            WHERE id_lesson = (SELECT id FROM LESSON WHERE token = ?)
        `, [token]);
        
        // Tính điểm
        let point = 0;
        let rightAns = list_answer.map(a => a.right_ans);
        
        for (let i = 0; i < rightAns.length; i++) {
            if (user_ans[i] === rightAns[i]) {
                point++;
            }
        }
        
        const score = (point / rightAns.length) * 10;
        
        // Lưu điểm vào database
        await db.query(`
            INSERT INTO USER_LEARNING (email, id_lesson, score) 
            VALUES (?, (SELECT id FROM LESSON WHERE token = ?), ?)
        `, [email, token, score]);
        
        res.status(200).json({
            success: true,
            score: score,
            correct: point,
            total: rightAns.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi nộp bài!" });
    }
});
```

### Frontend - Hiển thị Quiz

```javascript
// File: frontend/quiz/script.js

// Load danh sách video bài học
async function loadVideoLessons() {
    try {
        const response = await fetch('http://localhost:5001/api/video-game/get-token-lesson');
        const data = await response.json();
        
        if (data.success) {
            displayLessons(data.data);
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

// Lấy câu hỏi quiz
async function loadQuiz(token) {
    const authToken = localStorage.getItem('authToken');
    
    const response = await fetch('http://localhost:5001/api/video-game/get-question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token: token })
    });
    
    const data = await response.json();
    if (data.success) {
        displayQuestions(data.questions);
    }
}

// Nộp bài quiz
async function submitQuiz() {
    const userAnswers = collectUserAnswers();  // Thu thập đáp án người dùng
    const authToken = localStorage.getItem('authToken');
    
    const response = await fetch('http://localhost:5001/api/video-game/submit-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            token: currentLessonToken,
            user_ans: userAnswers
        })
    });
    
    const data = await response.json();
    if (data.success) {
        showResult(data.score, data.correct, data.total);
    }
}
```

### Cấu trúc Database cho Bài học & Quiz

```sql
-- File: backend/db/schema.sql

-- Bảng lưu bài học
CREATE TABLE LESSON (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,           -- Tên bài học
    topic VARCHAR(100) NOT NULL,          -- Chủ đề
    token CHAR(36) NOT NULL,              -- Token định danh
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng lưu video
CREATE TABLE VIDEO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_lesson INT NOT NULL,               -- Liên kết với bài học
    url_video VARCHAR(255),               -- URL video
    FOREIGN KEY (id_lesson) REFERENCES LESSON(id) ON DELETE CASCADE
);

-- Bảng lưu câu hỏi quiz
CREATE TABLE QUESTION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_lesson INT NOT NULL,               -- Liên kết với bài học
    question TEXT NOT NULL,               -- Nội dung câu hỏi
    ans_1 TEXT NOT NULL,                  -- Đáp án A
    ans_2 TEXT NOT NULL,                  -- Đáp án B
    ans_3 TEXT NOT NULL,                  -- Đáp án C
    ans_4 TEXT NOT NULL,                  -- Đáp án D
    right_ans CHAR(1) NOT NULL,           -- Đáp án đúng (A/B/C/D)
    FOREIGN KEY (id_lesson) REFERENCES LESSON(id) ON DELETE CASCADE
);

-- Bảng lưu tiến độ học của người dùng
CREATE TABLE USER_LEARNING (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),                   -- Email người dùng
    id_lesson INT,                        -- Bài học
    score FLOAT,                          -- Điểm số
    FOREIGN KEY (email) REFERENCES USERS(email) ON DELETE CASCADE,
    FOREIGN KEY (id_lesson) REFERENCES LESSON(id) ON DELETE CASCADE
);
```

---

## 2.4 Gửi Phản Ánh / Góp Ý

### Mô tả chức năng
Người dùng (kể cả không đăng nhập) có thể gửi phản ánh, góp ý về các vấn đề pháp luật. Hệ thống tạo mã tra cứu để người dùng theo dõi trạng thái xử lý.

### Backend - API Gửi phản ánh

```javascript
// File: backend/routes/feedback.js

// Tạo mã tra cứu duy nhất
function generateTrackingCode() {
    const prefix = 'FB';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// API gửi feedback (không cần đăng nhập)
router.post('/submit', upload.array('attachments', 5), async (req, res) => {
    try {
        const { fullName, location, contact, content, feedbackTypes, anonymous } = req.body;
        
        // Validate dữ liệu
        if (!location || !content) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
            });
        }

        // Tạo mã tra cứu duy nhất
        let trackingCode;
        let isUnique = false;
        while (!isUnique) {
            trackingCode = generateTrackingCode();
            const [existing] = await db.query(
                'SELECT id FROM FEEDBACK WHERE tracking_code = ?', 
                [trackingCode]
            );
            if (existing.length === 0) isUnique = true;
        }

        // Lưu feedback vào database
        const [result] = await db.query(`
            INSERT INTO FEEDBACK 
            (tracking_code, full_name, location, contact, content, feedback_types, anonymous) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            trackingCode,
            anonymous === 'true' ? null : fullName,
            location,
            contact,
            content,
            JSON.stringify(parsedFeedbackTypes),
            anonymous === 'true'
        ]);

        // Lưu file đính kèm nếu có
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await db.query(`
                    INSERT INTO FEEDBACK_ATTACHMENTS 
                    (feedback_id, file_name, file_path, file_type, file_size)
                    VALUES (?, ?, ?, ?, ?)
                `, [result.insertId, file.originalname, file.path, file.mimetype, file.size]);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Gửi góp ý thành công',
            trackingCode: trackingCode
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra' });
    }
});

// API tra cứu feedback theo mã
router.get('/track/:trackingCode', async (req, res) => {
    const { trackingCode } = req.params;

    const [feedback] = await db.query(`
        SELECT tracking_code, full_name, location, content, feedback_types,
               anonymous, status, admin_response, created_at, updated_at
        FROM FEEDBACK WHERE tracking_code = ?
    `, [trackingCode]);

    if (feedback.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy phản ánh với mã tra cứu này'
        });
    }

    res.status(200).json({ success: true, feedback: feedback[0] });
});
```

### Frontend - Form gửi phản ánh

```javascript
// File: frontend/feedback/script.js

// Xử lý submit form phản ánh
async function submitFeedback(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('fullName', document.getElementById('fullName').value);
    formData.append('location', document.getElementById('location').value);
    formData.append('contact', document.getElementById('contact').value);
    formData.append('content', document.getElementById('content').value);
    formData.append('feedbackTypes', JSON.stringify(getSelectedTypes()));
    formData.append('anonymous', document.getElementById('anonymous').checked);
    
    // Thêm file đính kèm
    selectedFiles.forEach(file => {
        formData.append('attachments', file);
    });
    
    try {
        const response = await fetch('http://localhost:5001/api/feedback/submit', {
            method: 'POST',
            body: formData  // FormData tự động set Content-Type
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessModal(data.trackingCode);
        }
    } catch (error) {
        showNotification('Lỗi gửi phản ánh', false);
    }
}
```

---

## 2.5 Quản Lý Hồ Sơ Người Dùng

### Mô tả chức năng
Người dùng đã đăng nhập có thể xem và cập nhật thông tin cá nhân, xem tiến độ học tập, đổi mật khẩu.

### Backend - API Profile

```javascript
// File: backend/routes/user-profile.js

// Lấy thông tin người dùng
router.get('/get-info', requireRole('admin', 'user'), async (req, res) => {
    const email = req.userPayload.sub;  // Lấy email từ JWT token
    
    try {
        // Lấy thông tin cơ bản
        const [base_info] = await db.query(
            'SELECT email, fullname, birthday, education_level, location, created_at ' +
            'FROM USERS WHERE email = ?',
            [email]
        );

        // Lấy tiến độ học tập
        const [learningProgress] = await db.query(`
            SELECT l.name AS lesson_name, l.topic, ul.score
            FROM USER_LEARNING ul
            JOIN LESSON l ON ul.id_lesson = l.id
            WHERE ul.email = ?
        `, [email]);

        res.status(200).json({
            success: true,
            information: base_info,
            learning: learningProgress
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy thông tin' });
    }
});

// Đổi mật khẩu
router.put('/update-password', requireRole('admin', 'user'), async (req, res) => {
    const { new_password } = req.body;
    const email = req.userPayload.sub;
    
    // Kiểm tra độ mạnh mật khẩu
    if (!isStrongPassword(new_password)) {
        return res.status(400).json({
            success: false,
            message: "Mật khẩu yếu, thử một mật khẩu khác!"
        });
    }
    
    const hashed_password = await bcrypt.hash(new_password, 10);
    
    await db.query('UPDATE USERS SET hashed_password = ? WHERE email = ?', 
                   [hashed_password, email]);
    
    res.status(200).json({ success: true, message: "Cập nhật mật khẩu thành công!" });
});

// Xóa tài khoản
router.delete('/delete-account', requireRole('admin', 'user'), async (req, res) => {
    const email = req.userPayload.sub;

    try {
        await db.query('DELETE FROM USERS WHERE email = ?', [email]);
        await db.query('DELETE FROM HISTORY WHERE email = ?', [email]);
        await db.query('DELETE FROM USER_LEARNING WHERE email = ?', [email]);
        await db.query('DELETE FROM WHITELIST WHERE email = ?', [email]);
        
        res.status(200).json({ success: true, message: "Xóa tài khoản thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi xóa tài khoản' });
    }
});
```

### Frontend - Trang Profile

```javascript
// File: frontend/profile/script.js

// Load thông tin người dùng
async function loadUserProfile() {
    const token = localStorage.getItem('authToken');
    
    try {
        const response = await fetch('http://localhost:5001/api/profile/get-info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Hiển thị thông tin cơ bản
            document.getElementById('displayName').textContent = data.information[0].fullname;
            document.getElementById('displayEmail').textContent = data.information[0].email;
            document.getElementById('displayLocation').textContent = data.information[0].location;
            
            // Hiển thị tiến độ học tập
            displayLearningProgress(data.learning);
        }
    } catch (error) {
        showNotification('Lỗi tải thông tin', false);
    }
}
```

---

## 2.6 Trang Admin Quản Trị

### Mô tả chức năng
Admin có thể quản lý người dùng, xem thống kê, quản lý feedback từ người dùng.

### Backend - API Quản lý người dùng (Admin)

```javascript
// File: backend/routes/user-management.js

// Lấy danh sách người dùng (có phân trang và filter)
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = 'all',
            education_level = 'all',
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build WHERE clause động
        let whereConditions = [];
        let queryParams = [];

        if (search.trim()) {
            whereConditions.push('(fullname LIKE ? OR email LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        if (role !== 'all') {
            whereConditions.push('role = ?');
            queryParams.push(role);
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ') 
            : '';

        // Đếm tổng số
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM USERS ${whereClause}`, 
            queryParams
        );

        // Lấy dữ liệu
        const [users] = await db.query(`
            SELECT id, fullname, email, birthday, education_level, 
                   location, role, created_at
            FROM USERS ${whereClause}
            ORDER BY ${sort_by} ${sort_order}
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        res.status(200).json({
            success: true,
            users: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi lấy danh sách" });
    }
});

// Thống kê người dùng
router.get('/users/statistics', requireRole('admin'), async (req, res) => {
    try {
        const [totalResult] = await db.query('SELECT COUNT(*) as total FROM USERS');
        
        const [roleStats] = await db.query(`
            SELECT role, COUNT(*) as count FROM USERS GROUP BY role
        `);
        
        const [educationStats] = await db.query(`
            SELECT education_level, COUNT(*) as count 
            FROM USERS GROUP BY education_level ORDER BY count DESC
        `);

        res.status(200).json({
            success: true,
            totalUsers: totalResult[0].total,
            byRole: roleStats,
            byEducation: educationStats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi lấy thống kê" });
    }
});
```

### Frontend - Giao diện Admin

```javascript
// File: frontend/admin/script.js

const CONFIG = {
    API_BASE: 'http://localhost:5001/api',
    TOKEN_CHECK_INTERVAL: 5 * 60 * 1000,  // Check token mỗi 5 phút
};

// Kiểm tra quyền admin
class AuthManager {
    static async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.redirectToLogin('Vui lòng đăng nhập để tiếp tục');
            return false;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE}/auth/check-online`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (!data.success || !data.online) {
                this.redirectToLogin('Phiên đăng nhập đã hết hạn');
                return false;
            }
            
            // Kiểm tra role admin
            if (data.role !== 'admin') {
                this.redirectToLogin('Bạn không có quyền truy cập');
                return false;
            }
            
            return true;
        } catch (error) {
            this.redirectToLogin('Lỗi xác thực');
            return false;
        }
    }
}
```

---

# 3. HƯỚNG DẪN DEPLOY LÊN VPS

## 3.1 VPS là gì?

**VPS (Virtual Private Server)** là một máy chủ ảo riêng, được tạo ra bằng cách phân chia một máy chủ vật lý thành nhiều máy chủ ảo độc lập. Mỗi VPS hoạt động như một máy tính riêng biệt với:

- **Hệ điều hành riêng**: Thường là Linux (Ubuntu, CentOS) hoặc Windows
- **Tài nguyên riêng**: CPU, RAM, ổ cứng được cấp phát riêng
- **IP riêng**: Địa chỉ IP công cộng để truy cập từ internet
- **Quyền root/admin**: Toàn quyền quản lý máy chủ

### So sánh các loại hosting

| Loại | Ưu điểm | Nhược điểm | Phù hợp với |
|------|---------|------------|-------------|
| **Shared Hosting** | Rẻ, dễ dùng | Chậm, giới hạn | Blog nhỏ, trang tĩnh |
| **VPS** | Linh hoạt, nhanh | Cần kiến thức | Trang web động, ứng dụng |
| **Dedicated Server** | Mạnh nhất | Đắt tiền | Doanh nghiệp lớn |

### Tại sao chọn VPS cho dự án này?

1. **Chạy được Node.js**: Shared hosting thường chỉ hỗ trợ PHP
2. **Cài được MySQL**: Toàn quyền quản lý database
3. **Tùy chỉnh hoàn toàn**: Cài đặt bất kỳ phần mềm nào
4. **Hiệu suất tốt**: Không bị ảnh hưởng bởi website khác

---

## 3.2 Các thành phần cần chuẩn bị trên VPS

### Sơ đồ tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     DOMAIN      │
                    │ buonlanghieuluat│
                    │     .com        │
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VPS SERVER                              │
│                    IP: xxx.xxx.xxx.xxx                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    NGINX (Web Server)                     │   │
│  │                    Port 80 (HTTP)                         │   │
│  │                    Port 443 (HTTPS)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                    │                 │
│           ▼                                    ▼                 │
│  ┌─────────────────┐                  ┌─────────────────┐       │
│  │    FRONTEND     │                  │    BACKEND      │       │
│  │   (Static files)│                  │   (Node.js)     │       │
│  │   Port 5555     │                  │   Port 5001     │       │
│  │                 │                  │                 │       │
│  │  - HTML/CSS/JS  │                  │  - Express.js   │       │
│  │  - Images       │                  │  - API Routes   │       │
│  └─────────────────┘                  └────────┬────────┘       │
│                                                │                 │
│                                                ▼                 │
│                                       ┌─────────────────┐       │
│                                       │    DATABASE     │       │
│                                       │    (MySQL)      │       │
│                                       │    Port 3306    │       │
│                                       │                 │       │
│                                       │ - USERS         │       │
│                                       │ - HISTORY       │       │
│                                       │ - LESSON        │       │
│                                       │ - FEEDBACK      │       │
│                                       └─────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  PROCESS MANAGER (PM2)                    │   │
│  │  - Giữ Node.js chạy liên tục                              │   │
│  │  - Tự khởi động lại khi crash                             │   │
│  │  - Quản lý logs                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Các phần mềm cần cài đặt trên VPS

| Phần mềm | Mục đích | Lệnh cài đặt |
|----------|----------|--------------|
| **Node.js** | Chạy backend | `sudo apt install nodejs npm` |
| **MySQL** | Database | `sudo apt install mysql-server` |
| **Nginx** | Web server, reverse proxy | `sudo apt install nginx` |
| **PM2** | Process manager | `sudo npm install -g pm2` |
| **Git** | Clone source code | `sudo apt install git` |
| **Certbot** | SSL certificate (HTTPS) | `sudo apt install certbot` |

---

## 3.3 Các bước triển khai

### Bước 1: Kết nối VPS qua SSH

```bash
# Từ máy tính cá nhân, mở Terminal và kết nối
ssh root@IP_VPS_CUA_BAN

# Ví dụ:
ssh root@103.163.118.181
```

<!-- [HÌNH 1: Screenshot kết nối SSH thành công] -->

### Bước 2: Cập nhật hệ thống

```bash
sudo apt update
sudo apt upgrade -y
```

### Bước 3: Cài đặt Node.js

```bash
# Cài Node.js LTS version
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra version
node -v    # v20.x.x
npm -v     # 10.x.x
```

### Bước 4: Cài đặt MySQL

```bash
# Cài đặt MySQL Server
sudo apt install mysql-server -y

# Bảo mật MySQL
sudo mysql_secure_installation

# Đăng nhập MySQL và tạo database
sudo mysql -u root -p
```

```sql
-- Trong MySQL prompt
CREATE DATABASE buonlanghieuluat;
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'mat_khau_manh';
GRANT ALL PRIVILEGES ON buonlanghieuluat.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;

-- Import schema
SOURCE /path/to/schema.sql;
```

### Bước 5: Clone source code

```bash
# Tạo thư mục project
mkdir -p /var/www
cd /var/www

# Clone từ Git (hoặc upload qua SFTP)
git clone https://github.com/your-repo/buonlanghieuluat.git
cd buonlanghieuluat
```

### Bước 6: Cài đặt dependencies và chạy Backend

```bash
# Vào thư mục backend
cd /var/www/buonlanghieuluat/backend

# Cài đặt packages
npm install

# Chạy thử
node app.js
# Server running at http://localhost:5001

# Dùng PM2 để chạy production
pm2 start app.js --name "backend"
pm2 save
pm2 startup
```

<!-- [HÌNH 2: Screenshot PM2 đang chạy] -->

### Bước 7: Cấu hình Nginx

```bash
# Tạo file cấu hình
sudo nano /etc/nginx/sites-available/buonlanghieuluat
```

```nginx
# File: /etc/nginx/sites-available/buonlanghieuluat

# Frontend - Trang chủ
server {
    listen 80;
    server_name buonlanghieuluat.com www.buonlanghieuluat.com;
    
    root /var/www/buonlanghieuluat/frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}

# Backend API
server {
    listen 80;
    server_name api.buonlanghieuluat.com;
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Kích hoạt cấu hình
sudo ln -s /etc/nginx/sites-available/buonlanghieuluat /etc/nginx/sites-enabled/

# Kiểm tra cấu hình
sudo nginx -t

# Khởi động lại Nginx
sudo systemctl restart nginx
```

### Bước 8: Cài đặt SSL (HTTPS)

```bash
# Cài Certbot
sudo apt install certbot python3-certbot-nginx -y

# Lấy SSL certificate
sudo certbot --nginx -d buonlanghieuluat.com -d www.buonlanghieuluat.com -d api.buonlanghieuluat.com

# Tự động gia hạn
sudo certbot renew --dry-run
```

<!-- [HÌNH 3: Screenshot website chạy với HTTPS] -->

---

# 4. HƯỚNG DẪN KẾT NỐI DOMAIN

## 4.1 Domain là gì?

**Domain (Tên miền)** là địa chỉ của website trên Internet, giúp người dùng truy cập dễ dàng thay vì phải nhớ địa chỉ IP.

Ví dụ:
- Thay vì nhập: `http://103.163.118.181`
- Người dùng chỉ cần nhập: `http://buonlanghieuluat.com`

### Cấu trúc Domain

```
https://www.buonlanghieuluat.com/quiz/index.html
  │      │          │           │        │
  │      │          │           │        └── File cụ thể
  │      │          │           └── Đường dẫn (path)
  │      │          └── Tên miền chính (domain)
  │      └── Subdomain (tên miền phụ)
  └── Protocol (giao thức)
```

### Các loại bản ghi DNS

| Loại | Mục đích | Ví dụ |
|------|----------|-------|
| **A Record** | Trỏ domain đến IP | buonlanghieuluat.com → 103.163.118.181 |
| **CNAME** | Alias cho domain | www → buonlanghieuluat.com |
| **MX** | Mail server | Dùng cho email |
| **TXT** | Xác minh | Google verification |

---

## 4.2 Mua Domain tại Vietnix

### Bước 1: Truy cập Vietnix

Truy cập website: https://vietnix.vn/ten-mien/

<!-- [HÌNH 4: Screenshot trang mua domain Vietnix] -->

### Bước 2: Tìm kiếm tên miền

1. Nhập tên miền muốn mua (ví dụ: `buonlanghieuluat`)
2. Chọn đuôi phù hợp: `.com`, `.vn`, `.com.vn`
3. Kiểm tra tên miền còn trống không

<!-- [HÌNH 5: Screenshot kết quả tìm kiếm domain] -->

### Bước 3: Đăng ký và thanh toán

1. Thêm vào giỏ hàng
2. Đăng ký tài khoản Vietnix (nếu chưa có)
3. Điền thông tin chủ sở hữu domain
4. Chọn thời gian đăng ký (1 năm, 2 năm,...)
5. Thanh toán

### Bước 4: Quản lý Domain

Sau khi mua, vào **Khu vực khách hàng** → **Quản lý Domain**

<!-- [HÌNH 6: Screenshot trang quản lý domain] -->

---

## 4.3 Kết nối Domain với VPS

### Bước 1: Lấy IP của VPS

```bash
# Trên VPS, chạy lệnh:
curl ifconfig.me

# Hoặc xem trong panel quản lý VPS
```

Ví dụ IP: `103.163.118.181`

### Bước 2: Cấu hình DNS tại Vietnix

1. Đăng nhập **Khu vực khách hàng Vietnix**
2. Vào **Quản lý Domain** → Chọn domain của bạn
3. Click **Quản lý DNS**

<!-- [HÌNH 7: Screenshot trang quản lý DNS] -->

### Bước 3: Thêm các bản ghi DNS

Thêm các bản ghi sau:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 103.163.118.181 | 3600 |
| A | www | 103.163.118.181 | 3600 |
| A | api | 103.163.118.181 | 3600 |

**Giải thích:**
- `@` = domain chính (buonlanghieuluat.com)
- `www` = www.buonlanghieuluat.com
- `api` = api.buonlanghieuluat.com (cho backend)

<!-- [HÌNH 8: Screenshot đã thêm bản ghi DNS] -->

### Bước 4: Chờ DNS cập nhật

DNS cần thời gian để phát tán (propagate) trên toàn cầu:
- **Nhanh**: 15 phút - 1 giờ
- **Chậm**: 24 - 48 giờ

### Bước 5: Kiểm tra kết nối

```bash
# Kiểm tra DNS đã trỏ đúng chưa
ping buonlanghieuluat.com

# Hoặc dùng website:
# https://www.whatsmydns.net/
```

<!-- [HÌNH 9: Screenshot ping thành công] -->

### Sơ đồ luồng kết nối

```
┌─────────────────┐
│   Người dùng    │
│  nhập URL vào   │
│    trình duyệt  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DNS Server    │  ← Trả về IP: 103.163.118.181
│   (Vietnix)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   VPS Server    │  ← Nginx nhận request
│  103.163.118.181│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Website       │  ← Trả về HTML/CSS/JS
│   hiển thị!     │
└─────────────────┘
```

---

# 5. KẾT LUẬN

## 5.1 Tóm tắt

Website "Buôn Làng Hiểu Luật" được xây dựng với:

| Phần | Công nghệ | Mục đích |
|------|-----------|----------|
| Frontend | HTML/CSS/JS | Giao diện người dùng |
| Backend | Node.js + Express | API server |
| Database | MySQL | Lưu trữ dữ liệu |
| AI | OpenRouter API | Chatbot hỗ trợ pháp luật |
| Hosting | VPS | Máy chủ chạy website |
| Domain | Vietnix | Tên miền truy cập |

## 5.2 Các tính năng đã triển khai

✅ Đăng ký / Đăng nhập với OTP email  
✅ Chatbot AI hỗ trợ pháp luật  
✅ Học bài qua video và làm quiz  
✅ Gửi phản ánh / góp ý  
✅ Quản lý hồ sơ người dùng  
✅ Trang Admin quản trị  
✅ Bảo mật với JWT Token  
✅ Deploy lên VPS với SSL  

## 5.3 Hướng phát triển

- Thêm tính năng đăng nhập Google
- Push notification cho người dùng
- Ứng dụng mobile (React Native)
- Dashboard thống kê nâng cao

---

**Tài liệu này được tạo để hỗ trợ nghiên cứu khoa học**  
**Ngày tạo: 27/12/2024**
