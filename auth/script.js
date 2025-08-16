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

// Vietnam Address Data
let addressData = {
    provinces: [],
    districts: {},
    wards: {}
};

/**
 * Load Vietnam address data from API
 */
async function loadAddressData() {
    try {
        // Load provinces
        const response = await fetch('https://provinces.open-api.vn/api/p/');
        const provinces = await response.json();
        
        addressData.provinces = provinces;
        populateProvinces();
        
    } catch (error) {
        console.error('Error loading address data:', error);
        // Fallback to basic provinces if API fails
        loadFallbackProvinces();
    }
}

/**
 * Populate provinces dropdown
 */
function populateProvinces() {
    const provinceSelect = document.getElementById('province');
    if (!provinceSelect) return;
    
    provinceSelect.innerHTML = '<option value="">Chọn tỉnh/thành phố</option>';
    
    addressData.provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.code;
        option.textContent = province.name;
        provinceSelect.appendChild(option);
    });
}

/**
 * Load districts for selected province
 */
async function loadDistricts(provinceCode) {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const provinceData = await response.json();
        
        const districtSelect = document.getElementById('district');
        const wardSelect = document.getElementById('ward');
        
        if (!districtSelect || !wardSelect) return;
        
        // Clear existing options
        districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
        wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
        
        // Populate districts
        provinceData.districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.code;
            option.textContent = district.name;
            districtSelect.appendChild(option);
        });
        
        addressData.districts[provinceCode] = provinceData.districts;
        
    } catch (error) {
        console.error('Error loading districts:', error);
        showNotification('Không thể tải danh sách quận/huyện', false);
    }
}

/**
 * Load wards for selected district
 */
async function loadWards(districtCode) {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const districtData = await response.json();
        
        const wardSelect = document.getElementById('ward');
        if (!wardSelect) return;
        
        wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
        
        // Populate wards
        districtData.wards.forEach(ward => {
            const option = document.createElement('option');
            option.value = ward.code;
            option.textContent = ward.name;
            wardSelect.appendChild(option);
        });
        
        addressData.wards[districtCode] = districtData.wards;
        
    } catch (error) {
        console.error('Error loading wards:', error);
        showNotification('Không thể tải danh sách phường/xã', false);
    }
}

/**
 * Fallback provinces data if API fails
 */
function loadFallbackProvinces() {
    const fallbackProvinces = [
        { code: '01', name: 'Hà Nội' },
        { code: '79', name: 'Thành phố Hồ Chí Minh' },
        { code: '48', name: 'Đà Nẵng' },
        { code: '92', name: 'Cần Thơ' },
        { code: '31', name: 'Hải Phòng' },
        { code: '02', name: 'Hà Giang' },
        { code: '04', name: 'Cao Bằng' },
        { code: '06', name: 'Bắc Kạn' },
        { code: '08', name: 'Tuyên Quang' },
        { code: '10', name: 'Lào Cai' },
        { code: '11', name: 'Điện Biên' },
        { code: '12', name: 'Lai Châu' },
        { code: '14', name: 'Sơn La' },
        { code: '15', name: 'Yên Bái' },
        { code: '17', name: 'Hoà Bình' },
        { code: '19', name: 'Thái Nguyên' },
        { code: '20', name: 'Lạng Sơn' },
        { code: '22', name: 'Quảng Ninh' },
        { code: '24', name: 'Bắc Giang' },
        { code: '25', name: 'Phú Thọ' },
        { code: '26', name: 'Vĩnh Phúc' },
        { code: '27', name: 'Bắc Ninh' },
        { code: '30', name: 'Hải Dương' },
        { code: '33', name: 'Hưng Yên' },
        { code: '34', name: 'Thái Bình' },
        { code: '35', name: 'Hà Nam' },
        { code: '36', name: 'Nam Định' },
        { code: '37', name: 'Ninh Bình' },
        { code: '38', name: 'Thanh Hóa' },
        { code: '40', name: 'Nghệ An' },
        { code: '42', name: 'Hà Tĩnh' },
        { code: '44', name: 'Quảng Bình' },
        { code: '45', name: 'Quảng Trị' },
        { code: '46', name: 'Thừa Thiên Huế' },
        { code: '49', name: 'Quảng Nam' },
        { code: '51', name: 'Quảng Ngãi' },
        { code: '52', name: 'Bình Định' },
        { code: '54', name: 'Phú Yên' },
        { code: '56', name: 'Khánh Hòa' },
        { code: '58', name: 'Ninh Thuận' },
        { code: '60', name: 'Bình Thuận' },
        { code: '62', name: 'Kon Tum' },
        { code: '64', name: 'Gia Lai' },
        { code: '66', name: 'Đắk Lắk' },
        { code: '67', name: 'Đắk Nông' },
        { code: '68', name: 'Lâm Đồng' },
        { code: '70', name: 'Bình Phước' },
        { code: '72', name: 'Tây Ninh' },
        { code: '74', name: 'Bình Dương' },
        { code: '75', name: 'Đồng Nai' },
        { code: '77', name: 'Bà Rịa - Vũng Tàu' },
        { code: '80', name: 'Long An' },
        { code: '82', name: 'Tiền Giang' },
        { code: '83', name: 'Bến Tre' },
        { code: '84', name: 'Trà Vinh' },
        { code: '86', name: 'Vĩnh Long' },
        { code: '87', name: 'Đồng Tháp' },
        { code: '89', name: 'An Giang' },
        { code: '91', name: 'Kiên Giang' },
        { code: '93', name: 'Hậu Giang' },
        { code: '94', name: 'Sóc Trăng' },
        { code: '95', name: 'Bạc Liêu' },
        { code: '96', name: 'Cà Mau' }
    ];
    
    addressData.provinces = fallbackProvinces;
    populateProvinces();
}

/**
 * Validate register form data
 */
function validateRegisterForm(formData) {
    const errors = [];
    
    // Validate fullname
    if (!formData.fullname || formData.fullname.trim().length < 2) {
        errors.push('Họ và tên phải có ít nhất 2 ký tự');
    }
    
    // Validate birthday
    if (!formData.birthday) {
        errors.push('Vui lòng chọn ngày sinh');
    } else {
        const birthDate = new Date(formData.birthday);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 13) {
            errors.push('Bạn phải từ 13 tuổi trở lên để đăng ký');
        }
        if (age > 120) {
            errors.push('Ngày sinh không hợp lệ');
        }
    }
    
    // Validate education level
    if (!formData.education_level) {
        errors.push('Vui lòng chọn trình độ học vấn');
    }
    
    // Validate location - check the actual select elements
    const provinceValue = document.getElementById('province')?.value;
    const districtValue = document.getElementById('district')?.value;
    const wardValue = document.getElementById('ward')?.value;
    
    if (!provinceValue || !districtValue || !wardValue) {
        errors.push('Vui lòng chọn đầy đủ thông tin địa chỉ (tỉnh/thành, quận/huyện, phường/xã)');
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
        errors.push('Email không hợp lệ');
    }
    
    // Validate password
    if (!formData.password || formData.password.length < 6) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
    }
    
    return errors;
}

/**
 * Get full address string
 */
function getFullAddress() {
    const provinceSelect = document.getElementById('province');
    const districtSelect = document.getElementById('district');
    const wardSelect = document.getElementById('ward');
    const addressDetail = document.getElementById('address_detail');
    
    if (!provinceSelect || !districtSelect || !wardSelect) return '';
    
    const provinceName = provinceSelect.options[provinceSelect.selectedIndex]?.text || '';
    const districtName = districtSelect.options[districtSelect.selectedIndex]?.text || '';
    const wardName = wardSelect.options[wardSelect.selectedIndex]?.text || '';
    const addressDetailValue = addressDetail ? addressDetail.value.trim() : '';
    
    let fullAddress = '';
    if (addressDetailValue) fullAddress += addressDetailValue + ', ';
    if (wardName) fullAddress += wardName + ', ';
    if (districtName) fullAddress += districtName + ', ';
    if (provinceName) fullAddress += provinceName;
    
    return fullAddress;
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Load address data for register page
    if (document.getElementById('province')) {
        loadAddressData();
        
        // Province change event
        document.getElementById('province').addEventListener('change', function() {
            const provinceCode = this.value;
            if (provinceCode) {
                loadDistricts(provinceCode);
            } else {
                const districtSelect = document.getElementById('district');
                const wardSelect = document.getElementById('ward');
                if (districtSelect) districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
                if (wardSelect) wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
            }
        });
        
        // District change event
        document.getElementById('district').addEventListener('change', function() {
            const districtCode = this.value;
            if (districtCode) {
                loadWards(districtCode);
            } else {
                const wardSelect = document.getElementById('ward');
                if (wardSelect) wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
            }
        });
        
        // Set date constraints for birthday
        const birthdayInput = document.getElementById('birthday');
        if (birthdayInput) {
            const today = new Date();
            const maxDate = today.toISOString().split('T')[0];
            birthdayInput.setAttribute('max', maxDate);
            
            const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
            birthdayInput.setAttribute('min', minDate.toISOString().split('T')[0]);
        }
    }

    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const otpForm = document.getElementById('otp-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = document.querySelector('.auth-btn');
            const originalText = submitButton.textContent;
            
            // Disable button and show loading
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            submitButton.textContent = 'Đang xử lý...';
            
            try {
                // Collect form data
                const formData = {
                    fullname: document.getElementById('fullname').value.trim(),
                    birthday: document.getElementById('birthday').value,
                    education_level: document.getElementById('education_level').value,
                    location: getFullAddress(),
                    email: document.getElementById('email').value.trim(),
                    password: document.getElementById('password').value,
                    confirmPassword: document.getElementById('confirm-password').value
                };
                
                // Validate form
                const errors = validateRegisterForm(formData);
                if (errors.length > 0) {
                    showNotification(errors[0], false);
                    return;
                }
                
                // Remove confirmPassword before sending to server
                delete formData.confirmPassword;

                const response = await fetch('http://localhost:5001/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                const data = await response.json();

                if (data.success) {
                    showNotification(data.message, true);
                    // Redirect to OTP page with the verification token after a short delay
                    setTimeout(() => {
                        window.location.href = `otp.html?token=${data.token}`;
                    }, 2000);
                } else {
                    showNotification(data.message, false);
                }
            } catch (error) {
                console.error('Lỗi đăng ký:', error);
                showNotification('Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.', false);
            } finally {
                // Re-enable button
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
                submitButton.textContent = originalText;
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
                    
                    // Check for redirect URL in localStorage
                    const redirectUrl = localStorage.getItem('redirect-url');
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        if (redirectUrl) {
                            // Clear the redirect URL and go to saved page
                            localStorage.removeItem('redirect-url');
                            window.location.href = redirectUrl;
                        } else {
                            // Default redirect to main page
                            window.location.href = '../main/';
                        }
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