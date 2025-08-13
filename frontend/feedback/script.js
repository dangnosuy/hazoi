// --- AUTHENTICATION LOGIC ---

/**
 * Checks login status by calling the backend endpoint.
 */
async function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const authButtons = document.getElementById('auth-buttons');
    const profileMenu = document.getElementById('profile-menu');

    // If no token, ensure user is treated as logged out
    if (!token) {
        if (authButtons) authButtons.style.display = 'flex';
        if (profileMenu) profileMenu.style.display = 'none';
        return;
    }

    try {
        const response = await fetch('http://localhost:5001/api/auth/check-online', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.online === true) {
                // User is logged in and token is valid
                if (authButtons) authButtons.style.display = 'none';
                if (profileMenu) profileMenu.style.display = 'block';
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
    }
}

/**
 * Toggles the visibility of the profile dropdown menu.
 */
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

/**
 * Toggles the main mobile navigation menu.
 */
function toggleMobileMenu() {
    document.getElementById('navMenu')?.classList.toggle('mobile-open');
}

/**
 * Handles the user logout process.
 * @param {boolean} redirect - Whether to redirect to the login page after logout.
 */
function logout(redirect = true) {
    localStorage.removeItem('authToken');
    if (redirect) {
        window.location.href = '../auth/login.html';
    } else {
        // Just update the UI without redirecting
        const authButtons = document.getElementById('auth-buttons');
        const profileMenu = document.getElementById('profile-menu');
        if (authButtons) authButtons.style.display = 'flex';
        if (profileMenu) profileMenu.style.display = 'none';
    }
}

// --- FEEDBACK FORM LOGIC ---

let selectedFiles = [];

/**
 * Initialize feedback form functionality
 */
function initializeFeedbackForm() {
    const form = document.getElementById('feedbackForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    const contentTextarea = document.getElementById('content');
    const charCount = document.getElementById('charCount');
    const anonymousCheckbox = document.getElementById('anonymous');
    const fullNameInput = document.getElementById('fullName');

    // Character count for textarea
    if (contentTextarea && charCount) {
        contentTextarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCount.textContent = currentLength;
            
            if (currentLength > 1800) {
                charCount.style.color = '#ef4444';
            } else if (currentLength > 1500) {
                charCount.style.color = '#f59e0b';
            } else {
                charCount.style.color = '#6b7280';
            }
        });
    }

    // Anonymous checkbox functionality
    if (anonymousCheckbox && fullNameInput) {
        anonymousCheckbox.addEventListener('change', function() {
            if (this.checked) {
                fullNameInput.value = '';
                fullNameInput.disabled = true;
                fullNameInput.placeholder = 'Gửi ẩn danh';
                fullNameInput.style.background = '#f3f4f6';
            } else {
                fullNameInput.disabled = false;
                fullNameInput.placeholder = 'Nhập họ và tên của bạn';
                fullNameInput.style.background = '#fafafa';
            }
        });
    }

    // File upload functionality
    if (fileUploadArea && fileInput) {
        // Click to select files
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop functionality
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            handleFileSelection(files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFileSelection(files);
        });
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', autoResizeTextarea);
    });
}

/**
 * Handle file selection
 */
function handleFileSelection(files) {
    files.forEach(file => {
        if (validateFile(file)) {
            selectedFiles.push(file);
            displayFile(file);
        }
    });
}

/**
 * Validate file type and size
 */
function validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/mov'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
        showNotification('Chỉ hỗ trợ file JPG, PNG, MP4, MOV', 'error');
        return false;
    }

    if (file.size > maxSize) {
        showNotification('File không được vượt quá 10MB', 'error');
        return false;
    }

    return true;
}

/**
 * Display selected file in the file list
 */
function displayFile(file) {
    const fileList = document.getElementById('fileList');
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const fileIcon = file.type.startsWith('image/') ? 'fa-image' : 'fa-video';
    const fileSize = formatFileSize(file.size);
    
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas ${fileIcon}"></i>
            <div>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${fileSize}</div>
            </div>
        </div>
        <button type="button" class="file-remove" onclick="removeFile('${file.name}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    fileList.appendChild(fileItem);
}

/**
 * Remove file from selection
 */
function removeFile(fileName) {
    selectedFiles = selectedFiles.filter(file => file.name !== fileName);
    
    // Remove from display
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        const nameElement = item.querySelector('.file-name');
        if (nameElement && nameElement.textContent === fileName) {
            item.remove();
        }
    });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Auto-resize textarea based on content
 */
function autoResizeTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    submitBtn.disabled = true;
    
    try {
        const formData = collectFormData();
        
        // Call actual API
        const result = await submitFeedback(formData);
        
        // Show success modal with tracking code
        showSuccessModal(result.trackingCode);
        
        // Reset form
        resetForm();
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại.', 'error');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Validate form data
 */
function validateForm() {
    const location = document.getElementById('location').value.trim();
    const content = document.getElementById('content').value.trim();
    const feedbackTypes = document.querySelectorAll('input[name="feedbackType"]:checked');
    
    if (!location) {
        showNotification('Vui lòng nhập thôn/buôn nơi sinh sống', 'error');
        document.getElementById('location').focus();
        return false;
    }
    
    if (!content) {
        showNotification('Vui lòng nhập nội dung chi tiết', 'error');
        document.getElementById('content').focus();
        return false;
    }
    
    if (feedbackTypes.length === 0) {
        showNotification('Vui lòng chọn ít nhất một loại nội dung', 'error');
        return false;
    }
    
    return true;
}

/**
 * Collect form data
 */
function collectFormData() {
    const anonymous = document.getElementById('anonymous').checked;
    const fullName = anonymous ? '' : document.getElementById('fullName').value.trim();
    const location = document.getElementById('location').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const content = document.getElementById('content').value.trim();
    const feedbackTypes = Array.from(document.querySelectorAll('input[name="feedbackType"]:checked'))
        .map(checkbox => checkbox.value);
    
    return {
        fullName,
        location,
        contact,
        content,
        feedbackTypes,
        anonymous,
        attachments: selectedFiles
    };
}

/**
 * Submit feedback to server
 */
async function submitFeedback(formData) {
    // Create FormData for file upload
    const submitData = new FormData();
    
    // Add form fields
    Object.keys(formData).forEach(key => {
        if (key === 'attachments') {
            formData[key].forEach(file => {
                submitData.append('attachments', file);
            });
        } else if (key === 'feedbackTypes') {
            submitData.append(key, JSON.stringify(formData[key]));
        } else {
            submitData.append(key, formData[key]);
        }
    });
    
    // Call actual API
    const response = await fetch('http://localhost:5001/api/feedback/submit', {
        method: 'POST',
        body: submitData
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
    }
    
    return response.json();
}

/**
 * Reset form to initial state
 */
function resetForm() {
    const form = document.getElementById('feedbackForm');
    if (form) {
        form.reset();
    }
    
    // Reset file selection
    selectedFiles = [];
    const fileList = document.getElementById('fileList');
    if (fileList) {
        fileList.innerHTML = '';
    }
    
    // Reset character count
    const charCount = document.getElementById('charCount');
    if (charCount) {
        charCount.textContent = '0';
        charCount.style.color = '#6b7280';
    }
    
    // Reset anonymous checkbox effect
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.disabled = false;
        fullNameInput.placeholder = 'Nhập họ và tên của bạn';
        fullNameInput.style.background = '#fafafa';
    }
}

/**
 * Show success modal with tracking code
 */
function showSuccessModal(trackingCode) {
    const modal = document.getElementById('successModal');
    if (modal) {
        // Update modal content to show tracking code
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <p>Cảm ơn bạn đã gửi góp ý. Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.</p>
                <div style="margin-top: 1rem; padding: 1rem; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
                    <p style="margin: 0; font-weight: 600; color: #0c4a6e;">Mã tra cứu của bạn:</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 1.2rem; font-weight: 700; color: #0ea5e9; font-family: monospace;">${trackingCode}</p>
                    <small style="color: #64748b;">Vui lòng lưu lại mã này để tra cứu tình trạng xử lý</small>
                </div>
            `;
        }
        modal.classList.add('show');
    }
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#fee2e2' : '#dbeafe'};
        color: ${type === 'error' ? '#dc2626' : '#1d4ed8'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// --- TRACKING FUNCTIONALITY ---

/**
 * Track feedback by tracking code
 */
async function trackFeedback() {
    const trackingCode = document.getElementById('trackingCodeInput')?.value.trim();
    
    if (!trackingCode) {
        showNotification('Vui lòng nhập mã tra cứu', 'error');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5001/api/feedback/track/${trackingCode}`);
        const data = await response.json();
        
        if (data.success) {
            displayTrackingResult(data.feedback);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error tracking feedback:', error);
        showNotification('Có lỗi xảy ra khi tra cứu', 'error');
    }
}

/**
 * Display tracking result
 */
function displayTrackingResult(feedback) {
    const resultDiv = document.getElementById('trackingResult');
    if (!resultDiv) return;
    
    const statusText = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'resolved': 'Đã giải quyết',
        'rejected': 'Từ chối'
    };
    
    const statusColor = {
        'pending': '#f59e0b',
        'processing': '#3b82f6',
        'resolved': '#10b981',
        'rejected': '#ef4444'
    };
    
    resultDiv.innerHTML = `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; background: white;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; color: #1f2937;">Kết quả tra cứu</h3>
                <span style="background: ${statusColor[feedback.status]}; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
                    ${statusText[feedback.status]}
                </span>
            </div>
            
            <div style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <strong>Mã tra cứu:</strong> ${feedback.tracking_code}
                </div>
                <div>
                    <strong>Ngày gửi:</strong> ${new Date(feedback.created_at).toLocaleDateString('vi-VN')}
                </div>
                ${feedback.full_name ? `<div><strong>Người gửi:</strong> ${feedback.full_name}</div>` : ''}
                <div>
                    <strong>Địa điểm:</strong> ${feedback.location}
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <strong>Nội dung:</strong>
                <p style="margin-top: 0.5rem; padding: 1rem; background: #f9fafb; border-radius: 6px; border-left: 4px solid #3b82f6;">
                    ${feedback.content}
                </p>
            </div>
            
            ${feedback.admin_response ? `
                <div>
                    <strong>Phản hồi từ cơ quan:</strong>
                    <p style="margin-top: 0.5rem; padding: 1rem; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #0ea5e9;">
                        ${feedback.admin_response}
                    </p>
                </div>
            ` : ''}
        </div>
    `;
    
    resultDiv.style.display = 'block';
}

// --- INITIALIZATION ---

/**
 * Initialize page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check login status
    checkLoginStatus();
    
    // Initialize feedback form
    initializeFeedbackForm();
    
    // Setup logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Close profile dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const profileMenu = document.querySelector('.profile-menu');
        const dropdown = document.getElementById('profile-dropdown');
        
        if (profileMenu && dropdown && !profileMenu.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Close modal when clicking outside
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .modal.show {
        display: flex !important;
    }
    
    .file-upload-area.dragover {
        border-color: #3b82f6;
        background-color: #eff6ff;
    }
`;
document.head.appendChild(style);