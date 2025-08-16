# Trang Profile Người Dùng

## Mô tả
Trang profile người dùng cho phép người dùng quản lý thông tin cá nhân, xem tiến độ học tập, đổi mật khẩu và xóa tài khoản. Được thiết kế với theme và authentication logic giống ai-chat.

## Tính năng

### 1. Thông tin cá nhân
- Hiển thị thông tin cơ bản: email, họ tên, ngày sinh, trình độ học vấn, địa chỉ
- Hiển thị ngày tham gia hệ thống
- Avatar người dùng (placeholder)

### 2. Tiến độ học tập
- Thống kê tổng số bài học đã hoàn thành
- Điểm trung bình của tất cả bài học
- Danh sách chi tiết các bài học đã hoàn thành với điểm số

### 3. Đổi mật khẩu
- Form đổi mật khẩu với validation
- Kiểm tra độ mạnh mật khẩu real-time
- Hiển thị/ẩn mật khẩu
- Xác nhận mật khẩu

### 4. Xóa tài khoản
- Cảnh báo rõ ràng về hậu quả
- Checkbox xác nhận trước khi xóa
- Xóa toàn bộ dữ liệu liên quan

## API Endpoints sử dụng

### GET /api/profile/get-info
Lấy thông tin người dùng và tiến độ học tập
```javascript
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}
```

### PUT /api/profile/update-password
Cập nhật mật khẩu người dùng
```javascript
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}
Body: {
    "new_password": "string"
}
```

### DELETE /api/profile/delelte-account
Xóa tài khoản người dùng
```javascript
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}
```

## Authentication Logic

### Kiểm tra trạng thái đăng nhập
- Sử dụng endpoint `/api/auth/check-online` giống ai-chat
- Tự động redirect về login nếu chưa đăng nhập
- Lưu URL hiện tại để redirect lại sau khi login

### Menu Navigation
- Format menu giống ai-chat với mobile responsive
- Profile dropdown với link active cho trang profile
- Logout functionality với confirmation

## Notification System
- Notification popup giống ai-chat
- Animation slide-in từ phải
- Progress bar tự động đếm ngược
- Support success/error states
- Auto-hide sau 5 giây

## Cách tích hợp

### 1. Cập nhật link trong các trang khác
Trong các file có dropdown menu profile, cập nhật link:
```html
<a href="../profile/" class="dropdown-item"><i class="fas fa-user-edit"></i> Chỉnh sửa hồ sơ</a>
```

### 2. Backend API Routes
Đảm bảo backend có các routes:
- `GET /api/profile/get-info`
- `PUT /api/profile/update-password` 
- `DELETE /api/profile/delelte-account`

## Responsive Design
- Mobile-first approach
- Sidebar menu chuyển thành horizontal scroll trên mobile
- Navigation menu collapse trên mobile
- Touch-friendly interface
- Optimized cho các kích thước màn hình khác nhau

## Bảo mật
- Kiểm tra authentication token trước mọi request
- Redirect về login nếu token invalid
- Password strength validation
- Confirmation dialog cho các hành động nguy hiểm
- CSRF protection thông qua Bearer token

## UX Features
- Loading overlay khi xử lý API
- Smooth animations và transitions
- Password strength indicator với màu sắc
- Form validation real-time
- Tab switching với animation
- Ripple effects cho buttons

## Files Structure
```
profile/
├── index.html          # Cấu trúc HTML chính
├── style.css           # Styling với theme website + notification
├── script.js           # Logic xử lý và API calls
└── README.md           # Tài liệu hướng dẫn
```

## Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive breakpoints: 480px, 768px, 1024px
- Font Awesome 6.0.0 icons
- Google Fonts (Roboto family)