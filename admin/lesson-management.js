// =================================================================================
// LESSON MANAGEMENT - SIMPLE VERSION
// Dựa trên style đơn giản của trang test, đầy đủ chức năng
// =================================================================================

const CONFIG = {
    API_BASE: 'http://103.163.118.181:5001/api',
    NOTIFICATION_DURATION: 4000
};

let lessons = [];
let isProcessing = false;

console.log('Lesson Management Script loaded successfully!');

// =================================================================================
// INITIALIZATION
// =================================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    initializeComponents();
    initializeFileUploads();
    initializeForms();
    checkAuthAndLoad();
});

function initializeComponents() {
    // Profile menu
    const profileBtn = document.querySelector('.profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', toggleProfileMenu);
    }

    // Close modals when clicking outside
    window.onclick = function(event) {
        if (!event.target.matches('.profile-btn, .profile-btn *')) {
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
        
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    }
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    showNotification('Đang đăng xuất...', 'info');
    setTimeout(() => {
        window.location.href = '../auth/login.html';
    }, 1500);
}

// =================================================================================
// NOTIFICATION SYSTEM
// =================================================================================
function showNotification(message, type = 'info') {
    console.log('Showing notification:', message, type);
    const notification = document.getElementById('notification');
    if (!notification) return;

    const icon = notification.querySelector('.notification-icon');
    const messageEl = notification.querySelector('.notification-message');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    if (icon) icon.className = `notification-icon ${icons[type] || icons.info}`;
    if (messageEl) messageEl.textContent = message;
    
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, CONFIG.NOTIFICATION_DURATION);
}

// =================================================================================
// AUTH CHECK
// =================================================================================
async function checkAuthAndLoad() {
    console.log('Checking authentication...');
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        showNotification('Vui lòng đăng nhập để tiếp tục', 'error');
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE}/auth/check-online`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Auth check result:', data);
        
        if (!response.ok || !data.success || !data.online) {
            showNotification('Phiên đăng nhập đã hết hạn', 'error');
            localStorage.removeItem('authToken');
            setTimeout(() => {
                window.location.href = '../auth/login.html';
            }, 2000);
            return;
        }
        
        // Auth OK, load lessons
        loadLessons();
        
    } catch (error) {
        console.error('Auth check error:', error);
        showNotification('Lỗi kiểm tra xác thực', 'error');
    }
}

// =================================================================================
// LESSON MANAGEMENT
// =================================================================================
async function loadLessons() {
    console.log('Loading lessons...');
    const container = document.getElementById('lessons-container');
    const countEl = document.getElementById('lesson-count');
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #6c757d;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Đang tải danh sách bài học...</p>
        </div>
    `;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE}/video-game/get-lesson-video`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            lessons = data.lesson || [];
            renderLessons();
            countEl.textContent = lessons.length;
            
            if (data.message) {
                showNotification(data.message, 'success');
            }
        } else {
            throw new Error(data.message || 'Không thể tải danh sách bài học');
        }
        
    } catch (error) {
        console.error('Error loading lessons:', error);
        showNotification(`Lỗi tải bài học: ${error.message}`, 'error');
        showEmptyState('Không thể tải danh sách bài học');
    }
}

function renderLessons() {
    const container = document.getElementById('lessons-container');
    
    if (lessons.length === 0) {
        showEmptyState('Chưa có bài học nào');
        return;
    }

    container.innerHTML = lessons.map((lesson, index) => `
        <div class="lesson-item">
            <div class="lesson-header" onclick="toggleLesson(${index})">
                <div class="lesson-info">
                    <h3>${lesson.name || 'Không có tên'}</h3>
                    <p class="lesson-topic">${lesson.topic || 'Không có chủ đề'}</p>
                </div>
                <div class="lesson-meta">
                    <span class="status-badge ${lesson.url_video ? 'has-video' : 'no-video'}">
                        <i class="fas ${lesson.url_video ? 'fa-video' : 'fa-video-slash'}"></i>
                        ${lesson.url_video ? 'Có video' : 'Chưa có video'}
                    </span>
                    <span style="color: #6c757d;">
                        <i class="fas fa-key"></i>
                        ${lesson.token ? lesson.token.substring(0, 8) + '...' : 'N/A'}
                    </span>
                    <i class="fas fa-chevron-down expand-icon" id="icon-${index}"></i>
                </div>
            </div>
            <div class="lesson-content" id="content-${index}">
                <div class="lesson-details">
                    <div class="detail-card">
                        <h4><i class="fas fa-info-circle"></i> Thông tin bài học</h4>
                        <p><strong>Tên:</strong> ${lesson.name || 'Không có'}</p>
                        <p><strong>Chủ đề:</strong> ${lesson.topic || 'Không có'}</p>
                        <p><strong>Token:</strong></p>
                        <div class="token-display">${lesson.token || 'Không có token'}</div>
                    </div>
                    <div class="detail-card">
                        <h4><i class="fas fa-video"></i> Video</h4>
                        ${lesson.url_video ? `
                            <div class="video-info">
                                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                                <a href="${lesson.url_video}" target="_blank" class="video-link">
                                    Xem video
                                </a>
                            </div>
                        ` : `
                            <div class="video-info">
                                <i class="fas fa-times-circle" style="color: #dc3545;"></i>
                                <span>Chưa có video</span>
                                <button class="btn btn-success" onclick="openUploadVideoModalWithToken('${lesson.token}')" style="margin-left: 10px; padding: 5px 10px; font-size: 12px;">
                                    <i class="fas fa-upload"></i> Upload
                                </button>
                            </div>
                        `}
                    </div>
                </div>
                <div class="questions-section">
                    <div class="questions-header">
                        <h4><i class="fas fa-question-circle"></i> Câu hỏi</h4>
                        <div>
                            <button class="btn btn-info" onclick="loadQuestions('${lesson.token}', ${index})" style="padding: 5px 10px; font-size: 12px;">
                                <i class="fas fa-sync-alt"></i> Tải câu hỏi
                            </button>
                            <button class="btn btn-success" onclick="openAddQuestionModalWithToken('${lesson.token}')" style="margin-left: 5px; padding: 5px 10px; font-size: 12px;">
                                <i class="fas fa-plus"></i> Thêm câu hỏi
                            </button>
                        </div>
                    </div>
                    <div id="questions-${index}">
                        <p style="color: #6c757d;">Click "Tải câu hỏi" để xem danh sách câu hỏi</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function showEmptyState(message) {
    const container = document.getElementById('lessons-container');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-book-open"></i>
            <h3>${message}</h3>
            <p>Hãy tạo bài học đầu tiên của bạn!</p>
            <button class="btn" onclick="openCreateLessonModal()">
                <i class="fas fa-plus"></i> Tạo bài học mới
            </button>
        </div>
    `;
}

function toggleLesson(index) {
    console.log('Toggling lesson:', index);
    const content = document.getElementById(`content-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    const header = content.previousElementSibling;
    
    if (content.classList.contains('show')) {
        content.classList.remove('show');
        icon.classList.remove('rotated');
        header.classList.remove('active');
    } else {
        // Close all other lessons
        document.querySelectorAll('.lesson-content.show').forEach(el => {
            el.classList.remove('show');
            const idx = el.id.split('-')[1];
            document.getElementById(`icon-${idx}`).classList.remove('rotated');
            el.previousElementSibling.classList.remove('active');
        });
        
        // Open current lesson
        content.classList.add('show');
        icon.classList.add('rotated');
        header.classList.add('active');
    }
}

// =================================================================================
// QUESTIONS MANAGEMENT
// =================================================================================
async function loadQuestions(token, lessonIndex) {
    console.log('Loading questions for token:', token);
    if (!token) {
        showNotification('Token không hợp lệ', 'error');
        return;
    }

    const questionsContainer = document.getElementById(`questions-${lessonIndex}`);
    
    questionsContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <i class="fas fa-spinner fa-spin"></i> Đang tải câu hỏi...
        </div>
    `;

    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE}/video-game/get-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: token })
        });
        
        const data = await response.json();
        console.log('Questions response:', data);
        
        if (data.success) {
            const questions = data.questions || [];
            renderQuestions(questions, lessonIndex);
            
            if (data.message) {
                showNotification(data.message, 'success');
            }
        } else {
            questionsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6c757d;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${data.message || 'Không có câu hỏi nào'}</p>
                </div>
            `;
            
            if (data.message) {
                showNotification(data.message, 'warning');
            }
        }
        
    } catch (error) {
        console.error('Error loading questions:', error);
        questionsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <i class="fas fa-times-circle"></i>
                <p>Lỗi tải câu hỏi: ${error.message}</p>
            </div>
        `;
        showNotification(`Lỗi tải câu hỏi: ${error.message}`, 'error');
    }
}

function renderQuestions(questions, lessonIndex) {
    const questionsContainer = document.getElementById(`questions-${lessonIndex}`);
    
    if (questions.length === 0) {
        questionsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                <i class="fas fa-question-circle"></i>
                <p>Chưa có câu hỏi nào cho bài học này</p>
            </div>
        `;
        return;
    }

    questionsContainer.innerHTML = questions.map((question, index) => `
        <div class="question-item">
            <div class="question-text">Câu ${index + 1}: ${question.question}</div>
            <div class="answers-grid">
                <div class="answer-item"><strong>A:</strong> ${question.ans_1}</div>
                <div class="answer-item"><strong>B:</strong> ${question.ans_2}</div>
                <div class="answer-item"><strong>C:</strong> ${question.ans_3}</div>
                <div class="answer-item"><strong>D:</strong> ${question.ans_4}</div>
            </div>
            <div class="correct-answer">
                <i class="fas fa-check"></i> Đáp án đúng: ${question.right_ans}
            </div>
        </div>
    `).join('');
}

// =================================================================================
// MODAL FUNCTIONS
// =================================================================================
function openCreateLessonModal() {
    console.log('Opening create lesson modal');
    showModal('createLessonModal');
}

function openUploadVideoModal() {
    console.log('Opening upload video modal');
    showModal('uploadVideoModal');
}

function openUploadVideoModalWithToken(token) {
    console.log('Opening upload video modal with token:', token);
    document.getElementById('videoToken').value = token;
    showModal('uploadVideoModal');
}

function openAddQuestionModal() {
    console.log('Opening add question modal');
    showModal('addQuestionModal');
}

function openAddQuestionModalWithToken(token) {
    console.log('Opening add question modal with token:', token);
    document.getElementById('questionToken').value = token;
    showModal('addQuestionModal');
}

function showModal(modalId) {
    console.log('Showing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        console.log('Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    console.log('Closing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // Reset file previews
            const previews = modal.querySelectorAll('.file-preview');
            previews.forEach(preview => preview.style.display = 'none');
            const uploadAreas = modal.querySelectorAll('.file-upload-area');
            uploadAreas.forEach(area => area.style.display = 'block');
        }
    }
}

// =================================================================================
// FILE UPLOAD HANDLING
// =================================================================================
function initializeFileUploads() {
    console.log('Initializing file uploads...');
    
    // Create lesson file upload
    const fileUploadArea = document.getElementById('fileUploadArea');
    const videoFile = document.getElementById('videoFile');
    
    if (fileUploadArea && videoFile) {
        setupDragAndDrop(fileUploadArea, videoFile, 'filePreview', 'fileName', 'fileSize');
        fileUploadArea.addEventListener('click', () => videoFile.click());
        videoFile.addEventListener('change', (e) => handleFileSelect(e, 'filePreview', 'fileName', 'fileSize'));
    }

    // Upload video file upload
    const videoUploadArea = document.getElementById('videoUploadArea');
    const videoFileInput = document.getElementById('videoFileInput');
    
    if (videoUploadArea && videoFileInput) {
        setupDragAndDrop(videoUploadArea, videoFileInput, 'videoFilePreview', 'videoFileName', 'videoFileSize');
        videoUploadArea.addEventListener('click', () => videoFileInput.click());
        videoFileInput.addEventListener('change', (e) => handleFileSelect(e, 'videoFilePreview', 'videoFileName', 'videoFileSize'));
    }
}

function setupDragAndDrop(uploadArea, fileInput, previewId, nameId, sizeId) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, e => { 
            e.preventDefault(); 
            e.stopPropagation(); 
        });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        });
    });
    
    uploadArea.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput }, previewId, nameId, sizeId);
        }
    });
}

function handleFileSelect(event, previewId, nameId, sizeId) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name, file.size);
    
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'];
    if (!validTypes.some(type => file.type.startsWith(type))) {
        showNotification('Định dạng file không hợp lệ. Vui lòng chọn file video.', 'error');
        event.target.value = '';
        return;
    }
    
    if (file.size > 2 * 1024 * 1024 * 1024) {
        showNotification('Kích thước file quá lớn (tối đa 2GB).', 'error');
        event.target.value = '';
        return;
    }
    
    displayFilePreview(file, previewId, nameId, sizeId);
}

function displayFilePreview(file, previewId, nameId, sizeId) {
    const uploadArea = document.getElementById(previewId).previousElementSibling;
    const preview = document.getElementById(previewId);
    const fileName = document.getElementById(nameId);
    const fileSize = document.getElementById(sizeId);
    
    uploadArea.style.display = 'none';
    preview.style.display = 'block';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
}

function removeFile() {
    const fileInput = document.getElementById('videoFile');
    const uploadArea = document.getElementById('fileUploadArea');
    const preview = document.getElementById('filePreview');
    
    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (preview) preview.style.display = 'none';
}

function removeVideoFile() {
    const fileInput = document.getElementById('videoFileInput');
    const uploadArea = document.getElementById('videoUploadArea');
    const preview = document.getElementById('videoFilePreview');
    
    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (preview) preview.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// =================================================================================
// FORM HANDLING
// =================================================================================
function initializeForms() {
    console.log('Initializing forms...');
    
    // Create lesson form
    const createLessonForm = document.getElementById('createLessonForm');
    if (createLessonForm) {
        createLessonForm.addEventListener('submit', handleCreateLesson);
    }

    // Upload video form
    const uploadVideoForm = document.getElementById('uploadVideoForm');
    if (uploadVideoForm) {
        uploadVideoForm.addEventListener('submit', handleUploadVideo);
    }

    // Add question form
    const addQuestionForm = document.getElementById('addQuestionForm');
    if (addQuestionForm) {
        addQuestionForm.addEventListener('submit', handleAddQuestion);
    }
}

async function handleCreateLesson(event) {
    event.preventDefault();
    console.log('Handling create lesson...');
    
    if (isProcessing) {
        showNotification('Đang xử lý, vui lòng đợi...', 'warning');
        return;
    }

    const name = document.getElementById('lessonName').value.trim();
    const topic = document.getElementById('lessonTopic').value.trim();
    const videoFile = document.getElementById('videoFile').files[0];

    if (!name || !topic) {
        showNotification('Vui lòng nhập đầy đủ tên và chủ đề bài học!', 'error');
        return;
    }

    isProcessing = true;
    const btn = document.getElementById('createLessonBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('name', name);
        formData.append('topic', topic);
        if (videoFile) {
            formData.append('video', videoFile);
        }

        const response = await fetch(`${CONFIG.API_BASE}/video-game/lesson-full`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();
        console.log('Create lesson result:', result);

        if (result.success) {
            showNotification(result.message || 'Tạo bài học thành công!', 'success');
            closeModal('createLessonModal');
            loadLessons();
        } else {
            showNotification(result.message || 'Có lỗi xảy ra khi tạo bài học', 'error');
        }

    } catch (error) {
        console.error('Error creating lesson:', error);
        showNotification(`Lỗi tạo bài học: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function handleUploadVideo(event) {
    event.preventDefault();
    console.log('Handling upload video...');
    
    if (isProcessing) {
        showNotification('Đang xử lý, vui lòng đợi...', 'warning');
        return;
    }

    const token = document.getElementById('videoToken').value.trim();
    const videoFile = document.getElementById('videoFileInput').files[0];

    if (!token) {
        showNotification('Vui lòng nhập token bài học!', 'error');
        return;
    }

    if (!videoFile) {
        showNotification('Vui lòng chọn file video!', 'error');
        return;
    }

    isProcessing = true;
    const btn = document.getElementById('uploadVideoBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang upload...';
    btn.disabled = true;

    try {
        const authToken = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('token', token);
        formData.append('video', videoFile);

        const response = await fetch(`${CONFIG.API_BASE}/video-game/lesson-full`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const result = await response.json();
        console.log('Upload video result:', result);

        if (result.success) {
            showNotification(result.message || 'Upload video thành công!', 'success');
            closeModal('uploadVideoModal');
            loadLessons();
        } else {
            showNotification(result.message || 'Có lỗi xảy ra khi upload video', 'error');
        }

    } catch (error) {
        console.error('Error uploading video:', error);
        showNotification(`Lỗi upload video: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function handleAddQuestion(event) {
    event.preventDefault();
    console.log('Handling add question...');
    
    if (isProcessing) {
        showNotification('Đang xử lý, vui lòng đợi...', 'warning');
        return;
    }

    const token = document.getElementById('questionToken').value.trim();
    const question = document.getElementById('questionText').value.trim();
    const ans_1 = document.getElementById('answer1').value.trim();
    const ans_2 = document.getElementById('answer2').value.trim();
    const ans_3 = document.getElementById('answer3').value.trim();
    const ans_4 = document.getElementById('answer4').value.trim();
    const right_ans = document.getElementById('correctAnswer').value;

    if (!token || !question || !ans_1 || !ans_2 || !ans_3 || !ans_4 || !right_ans) {
        showNotification('Vui lòng điền đầy đủ tất cả các trường!', 'error');
        return;
    }

    isProcessing = true;
    const btn = document.getElementById('addQuestionBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang thêm...';
    btn.disabled = true;

    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_BASE}/video-game/upload-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                question,
                ans_1,
                ans_2,
                ans_3,
                ans_4,
                right_ans
            })
        });

        const result = await response.json();
        console.log('Add question result:', result);

        if (result.success) {
            showNotification(result.message || 'Thêm câu hỏi thành công!', 'success');
            closeModal('addQuestionModal');
            loadLessons();
        } else {
            showNotification(result.message || 'Có lỗi xảy ra khi thêm câu hỏi', 'error');
        }

    } catch (error) {
        console.error('Error adding question:', error);
        showNotification(`Lỗi thêm câu hỏi: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}