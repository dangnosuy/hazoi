/**
 * Shows a notification popup
 * @param {string} message The message to display
 * @param {boolean} isSuccess Whether this is a success (true) or error (false) notification
 */
function showNotification(message, isSuccess = true) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.classList.remove('notification-show');
        setTimeout(() => {
            if (existingNotification.parentElement) {
                existingNotification.remove();
            }
        }, 300);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'notification-success' : 'notification-error'}`;
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${isSuccess ? 'fa-check' : 'fa-exclamation'}"></i>
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
        notification.classList.add('notification-show');
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
        notification.classList.remove('notification-show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 400);
    }
}

/**
 * Toggles the visibility of a password input field.
 * @param {string} inputId The ID of the password input field.
 */
function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const icon = passwordInput.nextElementSibling.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Checks the strength of a password and updates the UI.
 * @param {string} password The password to check.
 */
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (!strengthBar || !strengthText) return;

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let width = (score / 5) * 100;
    let color = '#ef4444'; // Weak (red)
    let text = 'Yếu';

    if (score >= 3) {
        color = '#f59e0b'; // Medium (orange)
        text = 'Trung bình';
    }
    if (score >= 5) {
        color = '#22c55e'; // Strong (green)
        text = 'Mạnh';
    }
    if (password.length === 0) {
        width = 0;
        text = '';
    }

    strengthBar.style.width = `${width}%`;
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = `Độ mạnh: ${text}`;
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const otpForm = document.getElementById('otp-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullnameInput = document.getElementById('fullname');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');

            if (passwordInput.value !== confirmPasswordInput.value) {
                showNotification('Mật khẩu xác nhận không khớp. Vui lòng thử lại.', false);
                return;
            }

            const fullname = fullnameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('http://localhost:5001/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fullname, email, password }),
                });

                const data = await response.json();

                if (data.success) {
                    showNotification(data.message, true);
                    // Redirect to OTP page with the verification token after a short delay
                    setTimeout(() => {
                        window.location.href = `otp.html?token=${data.token}`;
                    }, 3000);
                } else {
                    showNotification(data.message, false);
                }
            } catch (error) {
                console.error('Lỗi đăng ký:', error);
                showNotification('Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.', false);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('http://localhost:5001/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (data.success) {
                    showNotification(data.message, true);
                    // Store the JWT token in localStorage
                    localStorage.setItem('authToken', data.token);
                    // Redirect to main page after a short delay
                    setTimeout(() => {
                        window.location.href = '../main/';
                    }, 1500);
                } else {
                    showNotification(data.message, false);
                }
            } catch (error) {
                console.error('Lỗi đăng nhập:', error);
                showNotification('Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.', false);
            }
        });
    }

    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const otpInput = document.getElementById('otp');
            const otp = otpInput.value;

            // Get token from URL query string
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                showNotification('Không tìm thấy mã xác thực. Vui lòng thử lại từ trang đăng ký.', false);
                return;
            }

            try {
                const response = await fetch('http://localhost:5001/api/auth/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token, otp }),
                });

                const data = await response.json();

                if (data.success) {
                    showNotification(data.message, true);
                    // Redirect to login page after successful verification
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                } else {
                    showNotification(data.message, false);
                }
            } catch (error) {
                console.error('Lỗi xác thực OTP:', error);
                showNotification('Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại.', false);
            }
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const email = emailInput.value;

            try {
                const response = await fetch('http://localhost:5001/api/auth/forget-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                showNotification(data.message, data.success);

            } catch (error) {
                console.error('Lỗi gửi yêu cầu quên mật khẩu:', error);
                showNotification('Đã xảy ra lỗi. Vui lòng thử lại.', false);
            }
        });
    }

    // Reset password form validation and strength check
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        const newPasswordInput = document.getElementById('new-password');
        
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                checkPasswordStrength(newPasswordInput.value);
            });
        }

        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = newPasswordInput.value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            
            if (newPassword !== confirmNewPassword) {
                showNotification('Mật khẩu xác nhận không khớp. Vui lòng thử lại.', false);
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                showNotification('Không tìm thấy token đặt lại mật khẩu. Vui lòng thử lại từ email.', false);
                return;
            }

            try {
                const response = await fetch('http://localhost:5001/api/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ new_password: newPassword, token }),
                });

                const data = await response.json();

                showNotification(data.message, data.success);

                if (data.success) {
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            } catch (error) {
                console.error('Lỗi đặt lại mật khẩu:', error);
                showNotification('Đã xảy ra lỗi. Vui lòng thử lại.', false);
            }
        });
    }
});