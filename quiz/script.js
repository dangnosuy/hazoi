// --- AUTHENTICATION LOGIC (Copy y nguyên từ ai-chat) ---

/**
 * Shows a notification popup
 */
function showNotification(message, isSuccess = true) {
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
        existingNotification.classList.remove("notification-show");
        setTimeout(() => {
            if (existingNotification.parentElement) {
                existingNotification.remove();
            }
        }, 300);
    }

    const notification = document.createElement("div");
    notification.className = `notification ${isSuccess ? "notification-success" : "notification-error"}`;
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${isSuccess ? "fa-check" : "fa-exclamation"}"></i>
                </div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="removeNotification(this.closest('.notification'))">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-progress">
            <div class="notification-progress-bar"></div>
        </div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("notification-show"), 100);
    setTimeout(() => removeNotification(notification), 5000);
}

function removeNotification(notification) {
    if (notification && notification.parentElement) {
        notification.classList.remove("notification-show");
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 400);
    }
}

/**
 * Checks login status by calling the backend endpoint - Y NGUYÊN TỪ AI-CHAT
 */
async function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const authButtons = document.getElementById('auth-buttons');
    const profileMenu = document.getElementById('profile-menu');

    // If no token, ensure user is treated as logged out
    if (!token) {
        if (authButtons) authButtons.style.display = 'flex';
        if (profileMenu) profileMenu.style.display = 'none';
        // REDIRECT VỀ LOGIN NẾU CHƯA ĐĂNG NHẬP
        showNotification('Vui lòng đăng nhập để sử dụng tính năng này.', false);
        localStorage.setItem('redirect-url', window.location.href);
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetch('http://103.163.118.181:5001/api/auth/check-online', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data)
            if (data.online === true) {
                // User is logged in and token is valid
                if (authButtons) authButtons.style.display = 'none';
                if (profileMenu) profileMenu.style.display = 'block';
                // CHỈ LOAD CONTENT KHI ĐÃ ĐĂNG NHẬP
                loadVideoLessons();
            } else {
                // Token is invalid according to the backend
                logout(false);
            }
        } else {
            // Handle non-200 responses (e.g., 401 Unauthorized, 500 Server Error)
            logout(false);
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        // If the server is down or there's a network error, treat as logged out
        if (authButtons) authButtons.style.display = 'flex';
        if (profileMenu) profileMenu.style.display = 'none';
        // REDIRECT VỀ LOGIN
        showNotification('Không thể kết nối server. Vui lòng đăng nhập lại.', false);
        localStorage.setItem('redirect-url', window.location.href);
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 2000);
    }
}

/**
 * Toggles mobile menu - Y NGUYÊN TỪ AI-CHAT
 */
function toggleMobileMenu() {
    document.getElementById('navMenu')?.classList.toggle('mobile-open');
}

/**
 * Toggles profile menu - Y NGUYÊN TỪ AI-CHAT
 */
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

/**
 * Logout function - Y NGUYÊN TỪ AI-CHAT
 */
function logout(redirect = true) {
    localStorage.removeItem('authToken');
    if (redirect) {
        // Save current URL for redirect after login
        localStorage.setItem('redirect-url', window.location.href);
        window.location.href = '../auth/login.html';
    } else {
        // Just update the UI without redirecting
        const authButtons = document.getElementById('auth-buttons');
        const profileMenu = document.getElementById('profile-menu');
        if (authButtons) authButtons.style.display = 'flex';
        if (profileMenu) profileMenu.style.display = 'none';
        // REDIRECT VỀ LOGIN
        showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', false);
        localStorage.setItem('redirect-url', window.location.href);
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 2000);
    }
}

// --- VIDEO & QUIZ LOGIC ---

// Global variables
let currentVideos = [];
let currentVideoIndex = 0;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizTimer = null;
let timeLeft = 30;
let currentLessonToken = null;

// API Configuration
const API_BASE_URL = 'http://103.163.118.181:5001/api';

/**
 * Load video lessons from API - SỬ DỤNG DATA THỰC TỪ API MỚI
 */
async function loadVideoLessons() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        return; // Đã được xử lý trong checkLoginStatus
    }

    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/video-game/get-token-lesson`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load lessons');
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (data.success && data.data && data.data.length > 0) {
            // SỬ DỤNG DATA THỰC TỪ API
            currentVideos = data.data.map((lesson, index) => ({
                id: index + 1,
                token: lesson.token,
                title: lesson.name || `Bài học ${index + 1}`,
                description: `Chủ đề: ${lesson.topic || 'Kiến thức pháp luật'}`,
                duration: '15:30', // Có thể tính từ video URL sau
                topic: lesson.topic || 'Pháp luật Việt Nam',
                thumbnail: `https://via.placeholder.com/300x180?text=${encodeURIComponent(lesson.name || 'Video ' + (index + 1))}`,
                videoUrl: lesson.url_video || `https://www.youtube.com/embed/dQw4w9WgXcQ?si=example${index}`
            }));
            
            console.log('Processed videos:', currentVideos); // Debug log
            displayVideoList();
        } else {
            // Nếu không có data, hiển thị thông báo
            const videoList = document.getElementById('video-list');
            if (videoList) {
                videoList.innerHTML = `
                    <div class="loading-placeholder">
                        <i class="fas fa-info-circle"></i>
                        <span>Chưa có bài học nào được tạo.</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
        showNotification('Không thể tải danh sách bài học. Vui lòng thử lại.', false);
    } finally {
        showLoading(false);
    }
}

/**
 * Display video list in main view
 */
function displayVideoList() {
    const videoList = document.getElementById('video-list');
    if (!videoList || !currentVideos.length) return;

    videoList.innerHTML = currentVideos.map(video => `
        <div class="video-item" onclick="selectVideo(${video.id - 1})">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/300x180?text=Video'">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="video-content">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-description">${video.description}</p>
                <div class="video-meta">
                    <div class="video-duration">
                        <i class="fas fa-clock"></i>
                        <span>${video.duration}</span>
                    </div>
                    <div class="video-topic">
                        <i class="fas fa-tag"></i>
                        <span>${video.topic}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Select and play a video
 */
function selectVideo(index) {
    currentVideoIndex = index;
    const video = currentVideos[index];
    currentLessonToken = video.token;

    // Hide video list, show player
    document.getElementById('video-list-view').style.display = 'none';
    document.getElementById('video-player-layout').classList.add('active');

    // Update video player
    document.getElementById('main-video').src = video.videoUrl;
    document.getElementById('current-video-title').textContent = video.title;
    document.getElementById('current-video-duration').textContent = video.duration;
    document.getElementById('current-video-topic').textContent = video.topic;

    // Update sidebar
    displaySidebarVideos();
}

/**
 * Display videos in sidebar
 */
function displaySidebarVideos() {
    const sidebarList = document.getElementById('sidebar-video-list');
    if (!sidebarList) return;

    sidebarList.innerHTML = currentVideos.map((video, index) => `
        <div class="sidebar-video-item ${index === currentVideoIndex ? 'active' : ''}" 
             onclick="selectVideo(${index})">
            <div class="sidebar-video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/80x45?text=Video'">
            </div>
            <div class="sidebar-video-info">
                <div class="sidebar-video-title">${video.title}</div>
                <div class="sidebar-video-duration">${video.duration}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Start quiz for current lesson
 */
async function startQuiz() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        logout();
        return;
    }

    if (!currentLessonToken) {
        showNotification('Vui lòng chọn bài học trước khi làm quiz.', false);
        return;
    }

    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/video-game/get-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: currentLessonToken })
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load questions');
        }

        const data = await response.json();
        if (data.success && data.questions) {
            currentQuestions = data.questions;
            userAnswers = new Array(currentQuestions.length).fill(null);
            currentQuestionIndex = 0;
            
            // Hide video player, show quiz
            document.getElementById('video-player-layout').classList.remove('active');
            document.getElementById('quiz-screen').style.display = 'block';
            
            displayQuestion();
            startTimer();
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        showNotification('Không thể tải câu hỏi. Vui lòng thử lại.', false);
    } finally {
        showLoading(false);
    }
}

/**
 * Display current question
 */
function displayQuestion() {
    if (!currentQuestions.length) return;

    const question = currentQuestions[currentQuestionIndex];
    const questionText = document.getElementById('question-text');
    const answersGrid = document.getElementById('answers-grid');
    const questionCounter = document.getElementById('question-counter');
    const progressFill = document.getElementById('progress-fill');

    // Update question text
    if (questionText) {
        questionText.textContent = question.question;
    }

    // Update progress
    if (questionCounter) {
        questionCounter.textContent = `Câu ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    }
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }

    // Update answers
    if (answersGrid) {
        const answers = [
            { letter: 'A', text: question.ans_1 },
            { letter: 'B', text: question.ans_2 },
            { letter: 'C', text: question.ans_3 },
            { letter: 'D', text: question.ans_4 }
        ];

        answersGrid.innerHTML = answers.map(answer => `
            <div class="answer-option" onclick="selectAnswer('${answer.letter}')">
                <div class="answer-letter">${answer.letter}</div>
                <div class="answer-text">${answer.text}</div>
            </div>
        `).join('');

        // Restore previous selection
        if (userAnswers[currentQuestionIndex]) {
            const selectedOption = answersGrid.querySelector(`[onclick="selectAnswer('${userAnswers[currentQuestionIndex]}')"]`);
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }
        }
    }

    // Update navigation buttons
    updateNavigationButtons();
}

/**
 * Select an answer
 */
function selectAnswer(letter) {
    userAnswers[currentQuestionIndex] = letter;
    
    // Update UI
    const answersGrid = document.getElementById('answers-grid');
    if (answersGrid) {
        // Remove previous selection
        answersGrid.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selection to clicked option
        const selectedOption = answersGrid.querySelector(`[onclick="selectAnswer('${letter}')"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }

    updateNavigationButtons();
}

/**
 * Update navigation buttons
 */
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
    }

    if (nextBtn && submitBtn) {
        const hasAnswer = userAnswers[currentQuestionIndex] !== null;
        const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1;

        if (isLastQuestion) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = hasAnswer ? 'inline-flex' : 'none';
        } else {
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = !hasAnswer;
            submitBtn.style.display = 'none';
        }
    }
}

/**
 * Go to previous question
 */
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        resetTimer();
    }
}

/**
 * Go to next question
 */
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1 && userAnswers[currentQuestionIndex] !== null) {
        currentQuestionIndex++;
        displayQuestion();
        resetTimer();
    }
}

/**
 * Start timer for current question
 */
function startTimer() {
    timeLeft = 30;
    updateTimerDisplay();
    
    quizTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            // Auto advance to next question or submit
            if (currentQuestionIndex < currentQuestions.length - 1) {
                nextQuestion();
            } else {
                submitQuiz();
            }
        }
    }, 1000);
}

/**
 * Reset timer
 */
function resetTimer() {
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    startTimer();
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const timerText = document.getElementById('timer-text');
    const timerCircle = document.getElementById('timer-circle');
    
    if (timerText) {
        timerText.textContent = timeLeft;
    }
    
    if (timerCircle) {
        const circumference = 2 * Math.PI * 45;
        const progress = (30 - timeLeft) / 30;
        const offset = circumference * progress;
        
        timerCircle.style.strokeDasharray = circumference;
        timerCircle.style.strokeDashoffset = offset;
        
        // Change color based on time left
        if (timeLeft <= 5) {
            timerCircle.style.stroke = '#ef4444';
        } else if (timeLeft <= 10) {
            timerCircle.style.stroke = '#f59e0b';
        } else {
            timerCircle.style.stroke = '#dc2626';
        }
    }
}

/**
 * Submit quiz
 */
async function submitQuiz() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        logout();
        return;
    }

    if (quizTimer) {
        clearInterval(quizTimer);
    }

    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/video-game/submit-answer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: currentLessonToken,
                user_ans: userAnswers
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to submit quiz');
        }

        const data = await response.json();
        if (data.success) {
            displayResults(data);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        showNotification('Không thể nộp bài. Vui lòng thử lại.', false);
    } finally {
        showLoading(false);
    }
}

/**
 * Display quiz results
 */
function displayResults(data) {
    // Hide quiz screen, show results
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('results-screen').style.display = 'block';

    // Calculate stats
    const correctCount = data.right_answer.filter((answer, index) => answer === userAnswers[index]).length;
    const incorrectCount = currentQuestions.length - correctCount;
    const score = data.point || Math.round((correctCount / currentQuestions.length) * 100);

    // Update score display
    document.getElementById('final-score').textContent = score;
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('incorrect-count').textContent = incorrectCount;
    document.getElementById('total-count').textContent = currentQuestions.length;

    // Update results icon based on score
    const resultsIcon = document.getElementById('results-icon');
    if (resultsIcon) {
        resultsIcon.className = 'fas fa-trophy';
        if (score >= 80) {
            resultsIcon.classList.add('excellent');
        } else if (score >= 60) {
            resultsIcon.classList.add('good');
        } else if (score >= 40) {
            resultsIcon.classList.add('average');
        } else {
            resultsIcon.classList.add('poor');
        }
    }

    // Display detailed review
    displayAnswersReview(data.right_answer);
}

/**
 * Display detailed answers review
 */
function displayAnswersReview(correctAnswers) {
    const reviewContainer = document.getElementById('answers-review');
    if (!reviewContainer) return;

    reviewContainer.innerHTML = currentQuestions.map((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = correctAnswers[index];
        const isCorrect = userAnswer === correctAnswer;

        const answers = [
            { letter: 'A', text: question.ans_1 },
            { letter: 'B', text: question.ans_2 },
            { letter: 'C', text: question.ans_3 },
            { letter: 'D', text: question.ans_4 }
        ];

        return `
            <div class="review-question">
                <h4>Câu ${index + 1}: ${question.question}</h4>
                <div class="review-answers">
                    ${answers.map(answer => {
                        let className = 'answer-option';
                        if (answer.letter === correctAnswer) {
                            className += ' correct';
                        } else if (answer.letter === userAnswer && !isCorrect) {
                            className += ' incorrect';
                        }
                        return `
                            <div class="${className}">
                                <div class="answer-letter">${answer.letter}</div>
                                <div class="answer-text">${answer.text}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="review-result ${isCorrect ? 'correct' : 'incorrect'}">
                    <i class="fas ${isCorrect ? 'fa-check' : 'fa-times'}"></i>
                    ${isCorrect ? 'Chính xác!' : `Sai. Đáp án đúng là ${correctAnswer}.`}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Go back to video player
 */
function goBackToVideo() {
    document.getElementById('results-screen').style.display = 'none';
    document.getElementById('video-player-layout').classList.add('active');
}

/**
 * Retry current quiz
 */
function retryQuiz() {
    userAnswers = new Array(currentQuestions.length).fill(null);
    currentQuestionIndex = 0;
    
    document.getElementById('results-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';
    
    displayQuestion();
    startTimer();
}

/**
 * Go back to video list
 */
function goBackToList() {
    document.getElementById('results-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('video-player-layout').classList.remove('active');
    document.getElementById('video-list-view').style.display = 'block';
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication TRƯỚC KHI LÀM GÌ KHÁC
    checkLoginStatus();

    // Event listeners
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Close profile dropdown when clicking outside - Y NGUYÊN TỪ AI-CHAT
    window.addEventListener('click', (e) => {
        const profileMenu = document.getElementById('profile-menu');
        if (profileMenu && !profileMenu.contains(e.target)) {
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
    });

    // Close mobile menu when clicking outside - Y NGUYÊN TỪ AI-CHAT
    window.addEventListener('click', (e) => {
        const navMenu = document.getElementById('navMenu');
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (navMenu && !navMenu.contains(e.target) && !mobileToggle?.contains(e.target)) {
            navMenu.classList.remove('mobile-open');
        }
    });
});

console.log('🎥 Video Quiz system loaded with real API data');