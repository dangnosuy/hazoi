// --- AUTHENTICATION LOGIC ---

/**
 * Shows a notification popup
 * @param {string} message The message to display
 * @param {boolean} isSuccess Whether this is a success (true) or error (false) notification
 */
function showNotification(message, isSuccess = true) {
    // Remove any existing notifications
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
        existingNotification.classList.remove("notification-show");
        setTimeout(() => {
            if (existingNotification.parentElement) {
                existingNotification.remove();
            }
        }, 300);
    }

    // Create notification element
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

    // Add to body
    document.body.appendChild(notification);

    // Add slide-in animation
    setTimeout(() => {
        notification.classList.add("notification-show");
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(notification);
    }, 5000);
}

/**
 * Removes a notification with animation
 * @param {HTMLElement} notification The notification element to remove
 */
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
        // Redirect to login for profile page
        localStorage.setItem('redirect-url', window.location.href);
        window.location.href = '../auth/login.html';
        return;
    }

    try {
        const response = await fetch('http://103.163.118.181:5001/api/auth/check-online', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.online === true) {
                // User is logged in and token is valid
                if (authButtons) authButtons.style.display = 'none';
                if (profileMenu) profileMenu.style.display = 'block';
                // Load user profile data
                await loadUserProfile();
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
        // Redirect to login
        localStorage.setItem('redirect-url', window.location.href);
        window.location.href = '../auth/login.html';
    }
}

/**
 * Toggles the main mobile navigation menu.
 */
function toggleMobileMenu() {
    document.getElementById('navMenu')?.classList.toggle('mobile-open');
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
 * Handles the user logout process.
 * @param {boolean} redirect - Whether to redirect to the login page after logout.
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
        // For profile page, redirect anyway
        localStorage.setItem('redirect-url', window.location.href);
        window.location.href = '../auth/login.html';
    }
}

// --- PROFILE DATA MANAGEMENT ---

/**
 * Load user profile information from API
 */
async function loadUserProfile() {
    showLoading();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://103.163.118.181:5001/api/profile/get-info', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayUserInfo(data.information[0]);
                displayLearningProgress(data.learning);
            } else {
                showNotification(data.message || 'Không thể tải thông tin người dùng', false);
            }
        } else {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Lỗi khi tải thông tin người dùng');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Có lỗi xảy ra khi tải thông tin người dùng', false);
    } finally {
        hideLoading();
    }
}

/**
 * Display user information in the profile
 */
function displayUserInfo(userInfo) {
    document.getElementById('user-email').textContent = userInfo.email || 'Chưa cập nhật';
    document.getElementById('user-fullname').textContent = userInfo.fullname || 'Chưa cập nhật';
    document.getElementById('user-birthday').textContent = userInfo.birthday ? 
        new Date(userInfo.birthday).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
    document.getElementById('user-education').textContent = userInfo.education_level || 'Chưa cập nhật';
    document.getElementById('user-location').textContent = userInfo.location || 'Chưa cập nhật';
    document.getElementById('user-created').textContent = userInfo.created_at ? 
        new Date(userInfo.created_at).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
}

/**
 * Display learning progress
 */
function displayLearningProgress(learningData) {
    const totalLessons = learningData.length;
    const totalScore = learningData.reduce((sum, lesson) => sum + (lesson.score || 0), 0);
    const averageScore = totalLessons > 0 ? (totalScore / totalLessons).toFixed(1) : 0;

    // Update stats
    document.getElementById('total-lessons').textContent = totalLessons;
    document.getElementById('average-score').textContent = averageScore;

    // Update progress list
    const progressList = document.getElementById('progress-list');
    
    if (totalLessons === 0) {
        progressList.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-book-open"></i>
                <span>Bạn chưa hoàn thành bài học nào</span>
            </div>
        `;
        return;
    }

    progressList.innerHTML = learningData.map(lesson => `
        <div class="progress-item">
            <div class="progress-header">
                <div class="lesson-name">${lesson.lesson_name}</div>
                <div class="lesson-score">${lesson.score || 0} điểm</div>
            </div>
            <div class="lesson-topic">${lesson.topic || 'Chưa phân loại'}</div>
        </div>
    `).join('');
}

// --- TAB MANAGEMENT ---

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to selected menu item
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// --- PASSWORD MANAGEMENT ---

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        button.className = 'fas fa-eye';
    }
}

/**
 * Check password strength
 */
function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    let strength = 0;
    let message = '';
    let color = '';
    
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    switch (strength) {
        case 0:
        case 1:
            message = 'Mật khẩu rất yếu';
            color = '#ef4444';
            break;
        case 2:
            message = 'Mật khẩu yếu';
            color = '#f59e0b';
            break;
        case 3:
            message = 'Mật khẩu trung bình';
            color = '#3b82f6';
            break;
        case 4:
            message = 'Mật khẩu mạnh';
            color = '#10b981';
            break;
        case 5:
            message = 'Mật khẩu rất mạnh';
            color = '#059669';
            break;
    }
    
    strengthBar.style.width = `${(strength / 5) * 100}%`;
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = message;
    strengthText.style.color = color;
    
    return strength >= 3;
}

/**
 * Handle password form submission
 */
async function handlePasswordUpdate(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp', false);
        return;
    }
    
    if (!checkPasswordStrength(newPassword)) {
        showNotification('Mật khẩu không đủ mạnh. Vui lòng chọn mật khẩu khác.', false);
        return;
    }
    
    showLoading();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://103.163.118.181:5001/api/profile/update-password', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Cập nhật mật khẩu thành công!', true);
            document.getElementById('password-form').reset();
            
            // Reset password strength indicator
            document.querySelector('.strength-fill').style.width = '0%';
            document.querySelector('.strength-text').textContent = 'Nhập mật khẩu để kiểm tra độ mạnh';
            document.querySelector('.strength-text').style.color = '#6b7280';
        } else {
            if (response.status === 401) {
                logout();
                return;
            }
            showNotification(data.message || 'Có lỗi xảy ra khi cập nhật mật khẩu', false);
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showNotification('Có lỗi xảy ra khi cập nhật mật khẩu', false);
    } finally {
        hideLoading();
    }
}

// --- ACCOUNT DELETION ---

/**
 * Handle account deletion
 */
async function handleAccountDeletion() {
    const confirmed = confirm(
        'Xác nhận xóa tài khoản\n\nBạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác!'
    );
    
    if (!confirmed) return;
    
    showLoading();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://103.163.118.181:5001/api/profile/delelte-account', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('Tài khoản đã được xóa thành công', true);
            setTimeout(() => {
                localStorage.removeItem('authToken');
                window.location.href = '../main/';
            }, 2000);
        } else {
            if (response.status === 401) {
                logout();
                return;
            }
            showNotification(data.message || 'Có lỗi xảy ra khi xóa tài khoản', false);
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showNotification('Có lỗi xảy ra khi xóa tài khoản', false);
    } finally {
        hideLoading();
    }
}

// --- UI UTILITIES ---

/**
 * Show loading overlay
 */
function showLoading() {
    document.getElementById('loading-overlay').classList.add('show');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('show');
}

// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // Check login status on page load
    checkLoginStatus();
    
    // Tab switching
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
    
    // Password strength checking
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }
    
    // Delete account confirmation
    const deleteConfirmCheckbox = document.getElementById('delete-confirm');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    
    if (deleteConfirmCheckbox && deleteAccountBtn) {
        deleteConfirmCheckbox.addEventListener('change', (e) => {
            deleteAccountBtn.disabled = !e.target.checked;
        });
        
        deleteAccountBtn.addEventListener('click', handleAccountDeletion);
    }
    
    // Logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Close profile dropdown if clicked outside
    window.addEventListener('click', (e) => {
        const profileMenu = document.getElementById('profile-menu');
        if (profileMenu && !profileMenu.contains(e.target)) {
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
    });
});

// --- INITIALIZATION ---
console.log('🚀 Profile page loaded successfully!');
console.log('📱 Responsive design and touch interaction supported');
console.log('⚡ Optimized performance and user experience');