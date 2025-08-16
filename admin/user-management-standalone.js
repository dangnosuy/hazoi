// =================================================================================
// USER MANAGEMENT STANDALONE - WITH DEBUG CONSOLE
// =================================================================================

const API_BASE = 'http://103.163.118.181:5001/api';
let currentPage = 1;
let currentLimit = 10;
let usersData = [];

// =================================================================================
// DEBUG CONSOLE FUNCTIONS
// =================================================================================
function logToConsole(message, type = 'info') {
    const consoleEl = document.getElementById('consoleLog');
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `[${timestamp}] ${icon} ${message}`;
    logEntry.style.marginBottom = '5px';
    
    if (type === 'error') logEntry.style.color = '#ef4444';
    if (type === 'success') logEntry.style.color = '#10b981';
    if (type === 'warning') logEntry.style.color = '#f59e0b';
    
    consoleEl.appendChild(logEntry);
    consoleEl.scrollTop = consoleEl.scrollHeight;
    
    // Also log to browser console
    console.log(`[USER-MGMT] ${message}`);
}

function clearConsole() {
    document.getElementById('consoleLog').innerHTML = '<div>🚀 Console Debug Log:</div>';
}

// =================================================================================
// API FUNCTIONS WITH DEBUG
// =================================================================================
async function makeAPICall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    logToConsole(`🌐 API Call: ${options.method || 'GET'} ${url}`);
    
    try {
        // Mock token for testing - replace with real token
        const token = localStorage.getItem('authToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        if (finalOptions.body && typeof finalOptions.body === 'object') {
            finalOptions.body = JSON.stringify(finalOptions.body);
            logToConsole(`📤 Request Body: ${finalOptions.body}`);
        }
        
        logToConsole(`📋 Request Headers: ${JSON.stringify(finalOptions.headers)}`);
        
        const response = await fetch(url, finalOptions);
        
        logToConsole(`📥 Response Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        logToConsole(`📦 Response Data: ${JSON.stringify(data, null, 2)}`, 'success');
        
        return data;
        
    } catch (error) {
        logToConsole(`💥 API Error: ${error.message}`, 'error');
        throw error;
    }
}

// =================================================================================
// TEST API FUNCTION
// =================================================================================
async function testAPI() {
    logToConsole('🧪 Starting API Test...', 'warning');
    clearMessages();
    
    try {
        // Test 1: Check server connection
        logToConsole('Test 1: Checking server connection...');
        const healthCheck = await fetch(`${API_BASE}/health`).catch(() => null);
        
        if (!healthCheck) {
            logToConsole('❌ Server không phản hồi. Kiểm tra server có chạy không?', 'error');
            showMessage('Server không phản hồi! Hãy kiểm tra server có chạy ở port 5001 không?', 'error');
            return;
        }
        
        // Test 2: Test user statistics endpoint
        logToConsole('Test 2: Testing user statistics endpoint...');
        await loadUserStatistics();
        
        // Test 3: Test users list endpoint
        logToConsole('Test 3: Testing users list endpoint...');
        await loadUsers();
        
        logToConsole('✅ All API tests completed!', 'success');
        showMessage('API test hoàn thành! Kiểm tra console log để xem chi tiết.', 'success');
        
    } catch (error) {
        logToConsole(`💥 API Test failed: ${error.message}`, 'error');
        showMessage(`API Test thất bại: ${error.message}`, 'error');
    }
}

// =================================================================================
// LOAD USER STATISTICS
// =================================================================================
async function loadUserStatistics() {
    try {
        logToConsole('📊 Loading user statistics...');
        const response = await makeAPICall('/user-management/users/statistics');
        
        if (response.success) {
            const stats = response.statistics;
            
            document.getElementById('totalUsers').textContent = stats.total_users || 0;
            document.getElementById('newUsers').textContent = stats.new_users_this_month || 0;
            
            // Calculate role counts
            let adminCount = 0;
            let userCount = 0;
            
            if (stats.role_distribution) {
                stats.role_distribution.forEach(role => {
                    if (role.role === 'admin') adminCount = role.count;
                    if (role.role === 'user') userCount = role.count;
                });
            }
            
            document.getElementById('adminCount').textContent = adminCount;
            document.getElementById('userCount').textContent = userCount;
            
            logToConsole('✅ Statistics loaded successfully', 'success');
        }
        
    } catch (error) {
        logToConsole(`❌ Failed to load statistics: ${error.message}`, 'error');
        // Set default values
        document.getElementById('totalUsers').textContent = '?';
        document.getElementById('newUsers').textContent = '?';
        document.getElementById('adminCount').textContent = '?';
        document.getElementById('userCount').textContent = '?';
    }
}

// =================================================================================
// LOAD USERS
// =================================================================================
async function loadUsers(page = 1) {
    try {
        showLoading(true);
        logToConsole(`👥 Loading users (page ${page})...`);
        
        const search = document.getElementById('searchInput').value.trim();
        const role = document.getElementById('roleFilter').value;
        
        const params = new URLSearchParams({
            page: page,
            limit: currentLimit,
            search: search,
            role: role
        });
        
        const response = await makeAPICall(`/user-management/users?${params}`);
        
        if (response.success) {
            usersData = response.users;
            renderUsersTable(usersData);
            logToConsole(`✅ Loaded ${usersData.length} users`, 'success');
        }
        
    } catch (error) {
        logToConsole(`❌ Failed to load users: ${error.message}`, 'error');
        showMessage(`Không thể tải danh sách người dùng: ${error.message}`, 'error');
        renderEmptyTable();
    } finally {
        showLoading(false);
    }
}

// =================================================================================
// RENDER USERS TABLE
// =================================================================================
function renderUsersTable(users) {
    const tbody = document.getElementById('userTableBody');
    
    if (!users || users.length === 0) {
        renderEmptyTable();
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.fullname}</td>
            <td>${user.email}</td>
            <td>${user.age || 'N/A'}</td>
            <td>${user.education_level || 'N/A'}</td>
            <td>${user.location || 'N/A'}</td>
            <td>
                <span class="role-badge role-${user.role}">
                    ${user.role === 'admin' ? 'Admin' : 'User'}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewUser(${user.id})" title="Xem">👁️</button>
                <button class="action-btn btn-edit" onclick="changeRole(${user.id}, '${user.role}')" title="Đổi quyền">🔄</button>
                <button class="action-btn btn-delete" onclick="deleteUser(${user.id}, '${user.fullname}')" title="Xóa">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderEmptyTable() {
    document.getElementById('userTableBody').innerHTML = `
        <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                Không có dữ liệu người dùng
            </td>
        </tr>
    `;
}

// =================================================================================
// USER ACTIONS
// =================================================================================
async function viewUser(userId) {
    try {
        logToConsole(`👁️ Viewing user ${userId}...`);
        const response = await makeAPICall(`/user-management/users/${userId}`);
        
        if (response.success) {
            const user = response.user;
            alert(`Chi tiết người dùng:\n\nID: ${user.id}\nTên: ${user.fullname}\nEmail: ${user.email}\nTuổi: ${user.age}\nVai trò: ${user.role}\nNgày tạo: ${formatDate(user.created_at)}`);
            logToConsole(`✅ User details loaded for ID ${userId}`, 'success');
        }
        
    } catch (error) {
        logToConsole(`❌ Failed to view user: ${error.message}`, 'error');
        showMessage(`Không thể xem chi tiết: ${error.message}`, 'error');
    }
}

async function changeRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!confirm(`Đổi quyền người dùng từ ${currentRole} thành ${newRole}?`)) {
        return;
    }
    
    try {
        logToConsole(`🔄 Changing role for user ${userId} to ${newRole}...`);
        
        const response = await makeAPICall(`/user-management/users/${userId}/role`, {
            method: 'PUT',
            body: { role: newRole }
        });
        
        if (response.success) {
            logToConsole(`✅ Role changed successfully`, 'success');
            showMessage('Đổi quyền thành công!', 'success');
            loadUsers(currentPage);
            loadUserStatistics();
        }
        
    } catch (error) {
        logToConsole(`❌ Failed to change role: ${error.message}`, 'error');
        showMessage(`Không thể đổi quyền: ${error.message}`, 'error');
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`Xóa người dùng "${userName}"?\n\nHành động này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        logToConsole(`🗑️ Deleting user ${userId}...`);
        
        const response = await makeAPICall(`/user-management/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            logToConsole(`✅ User deleted successfully`, 'success');
            showMessage('Xóa người dùng thành công!', 'success');
            loadUsers(currentPage);
            loadUserStatistics();
        }
        
    } catch (error) {
        logToConsole(`❌ Failed to delete user: ${error.message}`, 'error');
        showMessage(`Không thể xóa người dùng: ${error.message}`, 'error');
    }
}

// =================================================================================
// ADD USER MODAL
// =================================================================================
function openAddModal() {
    document.getElementById('addModal').style.display = 'block';
    document.getElementById('addUserForm').reset();
}

function closeModal() {
    document.getElementById('addModal').style.display = 'none';
}

document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        fullname: document.getElementById('fullname').value.trim(),
        email: document.getElementById('email').value.trim(),
        birthday: document.getElementById('birthday').value,
        education_level: document.getElementById('education').value,
        location: document.getElementById('location').value.trim(),
        role: document.getElementById('role').value,
        password: document.getElementById('password').value
    };
    
    try {
        logToConsole(`➕ Adding new user: ${formData.fullname}...`);
        
        const response = await makeAPICall('/user-management/users', {
            method: 'POST',
            body: formData
        });
        
        if (response.success) {
            logToConsole(`✅ User added successfully`, 'success');
            showMessage('Thêm người dùng thành công!', 'success');
            closeModal();
            loadUsers(currentPage);
            loadUserStatistics();
        }
        
    } catch (error) {
        logToConsole(`❌ Failed to add user: ${error.message}`, 'error');
        showMessage(`Không thể thêm người dùng: ${error.message}`, 'error');
    }
});

// =================================================================================
// UTILITY FUNCTIONS
// =================================================================================
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('roleFilter').value = 'all';
    logToConsole('🔄 Filters reset');
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function showMessage(message, type) {
    // Remove existing messages
    const existing = document.querySelector('.error, .success');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.className = type;
    div.textContent = message;
    
    document.querySelector('.controls').appendChild(div);
    
    setTimeout(() => {
        if (div.parentNode) div.remove();
    }, 5000);
}

function clearMessages() {
    const messages = document.querySelectorAll('.error, .success');
    messages.forEach(msg => msg.remove());
}

// =================================================================================
// INITIALIZATION
// =================================================================================
document.addEventListener('DOMContentLoaded', function() {
    logToConsole('🚀 User Management Standalone loaded');
    logToConsole(`📡 API Base URL: ${API_BASE}`);
    
    // Load initial data
    loadUserStatistics();
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('addModal');
        if (event.target === modal) {
            closeModal();
        }
    }
});