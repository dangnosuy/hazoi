# Trang Hỏi đáp pháp luật - Trò chơi trắc nghiệm

## Mô tả
Trang trò chơi trắc nghiệm pháp luật cho phép người dùng kiểm tra kiến thức thông qua các bài thi trắc nghiệm có thời gian giới hạn. Mỗi câu hỏi có 30 giây để trả lời.

## Tính năng chính

### 1. Danh sách bài học
- Hiển thị các bài học có sẵn dựa trên token từ database
- Giao diện card đẹp mắt với thông tin bài học
- Click để bắt đầu làm bài

### 2. Hệ thống quiz
- **Timer 30 giây**: Mỗi câu hỏi có thời gian giới hạn 30 giây
- **Progress bar**: Hiển thị tiến độ làm bài
- **Navigation**: Có thể quay lại câu trước (nhưng không thể thay đổi đáp án)
- **Auto submit**: Tự động nộp bài khi hết thời gian câu cuối

### 3. Giao diện làm bài
- Hiển thị câu hỏi và 4 đáp án A, B, C, D
- Timer tròn với animation đếm ngược
- Thay đổi màu sắc khi sắp hết thời gian (vàng < 10s, đỏ < 5s)
- Chọn đáp án bằng click

### 4. Kết quả chi tiết
- Hiển thị điểm số tổng (thang điểm 100)
- Thống kê số câu đúng/sai
- **Review chi tiết**: 
  - Tô xanh đáp án đúng
  - Tô đỏ đáp án sai của người dùng
  - Hiển thị đáp án đúng cho mỗi câu

### 5. Tính năng bổ sung
- **Làm lại bài**: Có thể làm lại bài thi
- **Chọn bài khác**: Quay về danh sách bài học
- **Responsive**: Hoạt động tốt trên mobile

## API Endpoints sử dụng

### GET /api/lesson/get-token-lesson
Lấy danh sách token của các bài học
```javascript
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}

Response: {
    success: true,
    num_lesson: number,
    tokens: array
}
```

### POST /api/lesson/get-question
Lấy câu hỏi theo token bài học
```javascript
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}
Body: {
    "token": "string"
}

Response: {
    success: true,
    message: "string",
    questions: [
        {
            question: "string",
            ans_1: "string",
            ans_2: "string", 
            ans_3: "string",
            ans_4: "string",
            right_ans: "A|B|C|D"
        }
    ],
    token: "string"
}
```

### POST /api/lesson/submit-answer
Nộp bài và nhận kết quả
```javascript
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}
Body: {
    "token": "string",
    "user_ans": ["A", "C", "B", "D", "A"]
}

Response: {
    success: true,
    message: "string",
    right_answer: ["A", "B", "B", "D", "A"],
    user_ans: ["A", "C", "B", "D", "A"],
    point: number
}
```

## Luồng hoạt động

### 1. Khởi tạo
1. Kiểm tra authentication
2. Gọi API `get-token-lesson` để lấy danh sách bài
3. Hiển thị grid các bài học

### 2. Bắt đầu quiz
1. Click chọn bài → gọi API `get-question`
2. Khởi tạo mảng `userAnswers` với độ dài = số câu hỏi
3. Hiển thị câu hỏi đầu tiên
4. Bắt đầu timer 30 giây

### 3. Làm bài
1. Hiển thị câu hỏi và 4 đáp án
2. Timer đếm ngược từ 30 về 0
3. User click chọn đáp án → lưu vào `userAnswers[index]`
4. Click "Câu tiếp" hoặc hết thời gian → chuyển câu tiếp theo
5. Lặp lại cho đến câu cuối

### 4. Nộp bài
1. Tự động nộp khi:
   - Click "Nộp bài" ở câu cuối
   - Hết thời gian câu cuối
2. Gọi API `submit-answer` với mảng đáp án
3. Nhận kết quả và hiển thị

### 5. Hiển thị kết quả
1. Tính toán thống kê (đúng/sai/tổng)
2. Hiển thị điểm số với icon phù hợp
3. Review từng câu với màu sắc:
   - Xanh: đáp án đúng
   - Đỏ: đáp án sai của user
   - Highlight đáp án đúng

## Cấu trúc files

```
quiz/
├── index.html          # Giao diện chính
├── style.css           # Styling với theme gradient
├── script.js           # Logic quiz và timer
└── README.md           # Tài liệu hướng dẫn
```

## Tính năng UX

### Timer System
- **Visual timer**: Vòng tròn SVG với animation
- **Color coding**: 
  - Xanh dương: > 10s
  - Vàng: 5-10s  
  - Đỏ: < 5s
- **Auto advance**: Tự động chuyển câu khi hết thời gian

### Navigation
- **Progress bar**: Hiển thị % hoàn thành
- **Question counter**: "Câu X/Y"
- **Previous button**: Xem lại câu trước (không thể sửa)
- **Next button**: Chuyển câu tiếp (chỉ khi đã chọn đáp án)

### Results Display
- **Score visualization**: Icon trophy với màu theo điểm
  - 80-100: Vàng (excellent)
  - 60-79: Xanh dương (good)  
  - 40-59: Vàng cam (average)
  - < 40: Đỏ (poor)
- **Detailed review**: Từng câu với đáp án đúng/sai
- **Action buttons**: Làm lại hoặc chọn bài khác

## Responsive Design
- **Mobile-first**: Thiết kế ưu tiên mobile
- **Breakpoints**: 768px, 480px
- **Touch-friendly**: Buttons và areas đủ lớn cho touch
- **Stack layout**: Các elements xếp dọc trên mobile

## Bảo mật
- **Authentication required**: Phải đăng nhập mới sử dụng
- **Token validation**: Kiểm tra token trước mỗi API call
- **Auto logout**: Redirect về login khi token invalid
- **Prevent refresh**: Cảnh báo khi user muốn rời trang trong lúc làm bài

## Performance
- **Efficient rendering**: Chỉ render câu hiện tại
- **Memory management**: Clear timers khi không dùng
- **Smooth animations**: CSS transitions cho UX mượt mà
- **Loading states**: Hiển thị loading khi gọi API