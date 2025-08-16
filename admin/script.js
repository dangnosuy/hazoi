// =================================================================================
// ADMIN SCRIPT - PHIÊN BẢN MỚI
// Loại bỏ video upload cũ, chỉ giữ lại feedback management và shared functions
// =================================================================================

const CONFIG = {
    API_BASE: 'http://103.163.118.181:5001/api',
    TOKEN_CHECK_INTERVAL: 5 * 60 * 1000,
    NOTIFICATION_DURATION: 4000,
    UPLOAD_TIMEOUT: 60000
};

let currentPage = 1;
let currentLimit = 10;
let currentStatus = 'all';
let currentSearch = '';
let feedbackData = [];
let totalCount = 0;
let authCheckInterval = null;

// =================================================================================
// NOTIFICATION MANAGER
// =================================================================================
class NotificationManager {
    static show(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
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
        }, duration);
    }
}

// =================================================================================
// AUTH MANAGER
// =================================================================================
class AuthManager {
    static async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.redirectToLogin('Vui lòng đăng nhập để tiếp tục');
            return false;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE}/auth/check-online`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Auth check failed');
            }

            const data = await response.json();
            
            if (!data.success || !data.online) {
                this.redirectToLogin('Phiên đăng nhập đã hết hạn');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            this.redirectToLogin('Lỗi kiểm tra xác thực');
            return false;
        }
    }

    static redirectToLogin(message) {
        localStorage.removeItem('authToken');
        NotificationManager.show(message, 'error', 3000);
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 3000);
    }

    static startAuthMonitoring() {
        this.checkAuthStatus();
        
        if (authCheckInterval) {
            clearInterval(authCheckInterval);
        }
        
        authCheckInterval = setInterval(async () => {
            await this.checkAuthStatus();
        }, CONFIG.TOKEN_CHECK_INTERVAL);
    }

    static stopAuthMonitoring() {
        if (authCheckInterval) {
            clearInterval(authCheckInterval);
            authCheckInterval = null;
        }
    }
}

// =================================================================================
// API HELPER
// =================================================================================
class ApiHelper {
    static async makeRequest(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            AuthManager.redirectToLogin('Token không tồn tại');
            throw new Error('No auth token');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            
            if (response.status === 401) {
                AuthManager.redirectToLogin('Phiên đăng nhập đã hết hạn');
                throw new Error('Unauthorized');
            }

            return response;
        } catch (error) {
            throw error;
        }
    }
}

// =================================================================================
// MAIN INITIALIZATION
// =================================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo auth monitoring
    AuthManager.startAuthMonitoring();
    
    // Khởi tạo shared components
    initializeSharedComponents();

    // Khởi tạo page-specific logic
    if (document.getElementById('feedbackTableBody')) {
        initializeFeedbackPage();
    }
    
    // Redirect video upload page to new lesson management
    if (document.getElementById('video-upload-form')) {
        redirectToLessonManagement();
    }
});

// =================================================================================
// SHARED COMPONENTS
// =================================================================================
function initializeSharedComponents() {
    const profileToggle = document.querySelector('.profile-toggle');
    if (profileToggle) {
        profileToggle.addEventListener('click', toggleProfileMenu);
    }

    window.onclick = function(event) {
        if (!event.target.matches('.profile-toggle, .profile-toggle *')) {
            const dropdowns = document.getElementsByClassName("profile-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    }
}

function toggleProfileMenu() {
    document.getElementById('profileDropdown').classList.toggle('show');
}

function logout() {
    AuthManager.stopAuthMonitoring();
    localStorage.removeItem('authToken');
    NotificationManager.show('Đang đăng xuất...', 'info');
    setTimeout(() => {
        window.location.href = '../auth/login.html';
    }, 1500);
}

// =================================================================================
// VIDEO UPLOAD REDIRECT
// =================================================================================
function redirectToLessonManagement() {
    // Hiển thị thông báo và redirect
    NotificationManager.show('Đang chuyển hướng đến trang quản lý bài học mới...', 'info', 3000);
    
    setTimeout(() => {
        window.location.href = 'lesson-management.html';
    }, 2000);
}

// =================================================================================
// FEEDBACK MANAGEMENT
// =================================================================================
function initializeFeedbackPage() {
    initializeEventListeners();
    loadFeedbackData();
    loadStatistics();
}

function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = this.value;
                currentPage = 1;
                loadFeedbackData();
            }, 500);
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatus = this.value;
            currentPage = 1;
            loadFeedbackData();
        });
    }

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            currentPage = 1;
            loadFeedbackData();
        });
    }

    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', handleUpdateStatus);
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    });
}

async function loadFeedbackData() {
    try {
        showLoading(true);
        
        const isAuthenticated = await AuthManager.checkAuthStatus();
        if (!isAuthenticated) return;

        const params = new URLSearchParams({
            page: currentPage,
            limit: currentLimit,
            status: currentStatus,
            search: currentSearch
        });

        const response = await ApiHelper.makeRequest(`${CONFIG.API_BASE}/feedback/list?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Không thể tải dữ liệu feedback`);
        }

        const data = await response.json();
        
        if (data.success) {
            feedbackData = data.feedbacks;
            totalCount = data.pagination.total;
            renderFeedbackTable();
            renderPagination(data.pagination);
            updateTotalCount();
        } else {
            throw new Error(data.message || 'Có lỗi xảy ra khi tải dữ liệu');
        }
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        NotificationManager.show('Không thể tải dữ liệu: ' + error.message, 'error', 5000);
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

async function loadStatistics() {
    try {
        const isAuthenticated = await AuthManager.checkAuthStatus();
        if (!isAuthenticated) return;

        const statuses = ['pending', 'processing', 'resolved', 'rejected'];
        
        for (const status of statuses) {
            try {
                const response = await ApiHelper.makeRequest(`${CONFIG.API_BASE}/feedback/list?status=${status}&limit=1`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        const element = document.getElementById(`${status}Count`);
                        if (element) {
                            element.textContent = data.pagination.total;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading ${status} statistics:`, error);
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function renderFeedbackTable() {
    const tbody = document.getElementById('feedbackTableBody');
    if (!tbody) return;

    if (feedbackData.length === 0) {
        showEmptyState();
        return;
    }

    tbody.innerHTML = feedbackData.map(feedback => `
        <tr>
            <td><span class="tracking-code">${feedback.tracking_code}</span></td>
            <td>${feedback.anonymous ? 
                '<span class="anonymous-user"><i class="fas fa-user-secret"></i> Ẩn danh</span>' : 
                (feedback.full_name || 'Không có tên')
            }</td>
            <td>${feedback.location || 'Không có'}</td>
            <td>
                <div class="feedback-types">
                    ${feedback.feedback_types.map(type => 
                        `<span class="type-tag">${type}</span>`
                    ).join('')}
                </div>
            </td>
            <td><span class="status-badge status-${feedback.status}">${getStatusText(feedback.status)}</span></td>
            <td>${formatDate(feedback.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-view" onclick="viewFeedback('${feedback.tracking_code}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-edit" onclick="openUpdateModal('${feedback.tracking_code}', '${feedback.status}')" title="Cập nhật trạng thái">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    hideEmptyState();
}

function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    const { page, totalPages } = pagination;
    let paginationHTML = `
        <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="changePage(${page - 1})" title="Trang trước">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === page ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    paginationHTML += `
        <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})" title="Trang sau">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;

    const start = (page - 1) * currentLimit + 1;
    const end = Math.min(page * currentLimit, totalCount);
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${start} - ${end} của ${totalCount} kết quả`;
    }
}

async function viewFeedback(trackingCode) {
    try {
        const isAuthenticated = await AuthManager.checkAuthStatus();
        if (!isAuthenticated) return;

        const response = await ApiHelper.makeRequest(`${CONFIG.API_BASE}/feedback/detail/${trackingCode}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Không thể tải chi tiết feedback`);
        }

        const data = await response.json();
        
        if (data.success) {
            renderFeedbackDetail(data.feedback);
            showModal('feedbackModal');
        } else {
            throw new Error(data.message || 'Có lỗi xảy ra khi tải chi tiết');
        }
    } catch (error) {
        console.error('Error loading feedback detail:', error);
        NotificationManager.show('Không thể tải chi tiết: ' + error.message, 'error', 5000);
    }
}

function renderFeedbackDetail(feedback) {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
        <div class="feedback-detail">
            <div class="detail-header">
                <h3>Chi tiết phản hồi #${feedback.tracking_code}</h3>
                <span class="status-badge status-${feedback.status}">${getStatusText(feedback.status)}</span>
            </div>
            
            <div class="detail-content">
                <div class="detail-row">
                    <label>Người gửi:</label>
                    <span>${feedback.anonymous ? 'Ẩn danh' : (feedback.full_name || 'Không có tên')}</span>
                </div>
                
                ${!feedback.anonymous ? `
                    <div class="detail-row">
                        <label>Email:</label>
                        <span>${feedback.email || 'Không có'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Số điện thoại:</label>
                        <span>${feedback.phone || 'Không có'}</span>
                    </div>
                ` : ''}
                
                <div class="detail-row">
                    <label>Địa điểm:</label>
                    <span>${feedback.location || 'Không có'}</span>
                </div>
                
                <div class="detail-row">
                    <label>Loại phản hồi:</label>
                    <div class="feedback-types">
                        ${feedback.feedback_types.map(type => `<span class="type-tag">${type}</span>`).join('')}
                    </div>
                </div>
                
                <div class="detail-row">
                    <label>Nội dung:</label>
                    <div class="feedback-content">${feedback.content || 'Không có nội dung'}</div>
                </div>
                
                ${feedback.admin_response ? `
                    <div class="detail-row">
                        <label>Phản hồi của admin:</label>
                        <div class="admin-response">${feedback.admin_response}</div>
                    </div>
                ` : ''}
                
                <div class="detail-row">
                    <label>Ngày tạo:</label>
                    <span>${formatDate(feedback.created_at)}</span>
                </div>
                
                ${feedback.updated_at ? `
                    <div class="detail-row">
                        <label>Cập nhật lần cuối:</label>
                        <span>${formatDate(feedback.updated_at)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function openUpdateModal(trackingCode, currentStatus) {
    const codeInput = document.getElementById('updateTrackingCode');
    const statusInput = document.getElementById('newStatus');
    const responseInput = document.getElementById('adminResponse');
    
    if (codeInput) codeInput.value = trackingCode;
    if (statusInput) statusInput.value = currentStatus;
    if (responseInput) responseInput.value = '';
    
    showModal('updateStatusModal');
}

async function handleUpdateStatus(e) {
    e.preventDefault();
    
    try {
        const trackingCode = document.getElementById('updateTrackingCode').value;
        const status = document.getElementById('newStatus').value;
        const adminResponse = document.getElementById('adminResponse').value;

        if (!trackingCode || !status) {
            NotificationManager.show('Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }

        const isAuthenticated = await AuthManager.checkAuthStatus();
        if (!isAuthenticated) return;

        const response = await ApiHelper.makeRequest(`${CONFIG.API_BASE}/feedback/update/${trackingCode}`, {
            method: 'PUT',
            body: JSON.stringify({
                status: status,
                adminResponse: adminResponse
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Không thể cập nhật trạng thái`);
        }

        const data = await response.json();
        
        if (data.success) {
            NotificationManager.show('Cập nhật trạng thái thành công!', 'success', 4000);
            closeAllModals();
            loadFeedbackData();
            loadStatistics();
        } else {
            throw new Error(data.message || 'Có lỗi xảy ra khi cập nhật');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        NotificationManager.show('Không thể cập nhật: ' + error.message, 'error', 5000);
    }
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================
function changePage(page) {
    currentPage = page;
    loadFeedbackData();
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'resolved': 'Đã giải quyết',
        'rejected': 'Từ chối'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'Không có';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateTotalCount() {
    const totalElement = document.getElementById('totalCount');
    if (totalElement) {
        totalElement.textContent = totalCount;
    }
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');
    
    if (emptyState) emptyState.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
}

function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');
    
    if (emptyState) emptyState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}