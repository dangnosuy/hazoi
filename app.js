const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());            // Cho phép frontend gọi từ domain khác
app.use(express.json());    // Đọc JSON body

// Import routes
const authRoutes = require('./routes/authentication');
const chatbotRoutes = require('./routes/chatbot');
const videoGames = require('./routes/video-and-game');
const userManagementRoutes = require('./routes/user-management');
const feedbackRoutes = require('./routes/feedback');

// Sử dụng routes
app.use('/api/auth', authRoutes);          // Ví dụ: /api/auth/login, /api/auth/register
//app.use('/api/admin', authAdmin);
app.use('/api/chatbot', chatbotRoutes);  
app.use('/api/video-game', videoGames);
app.use('/api/user-management', userManagementRoutes);  // Thêm route user management
app.use('/api/feedback', feedbackRoutes);  // Thêm route feedback

//console.log('myRouter:', authRoutes)

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});