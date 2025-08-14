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
            <button class="notification-close" onclick="removeNotification(this.closest(".notification"))">
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
        return;
    }

    try {
        const response = await fetch('http://localhost:5001/api/auth/check-online', {
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
                loadChatHistory();
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
 * Fetches and displays the user's chat history.
 */
async function loadChatHistory() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const historyContainer = document.querySelector('.chat-history');
    if (!historyContainer) return;

    try {
        const response = await fetch('http://localhost:5001/api/chatbot/get/title/history/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load history');
        const data = await response.json();

        historyContainer.innerHTML = ''; // Clear
        if (data.success && data.history.length > 0) {
            data.history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.classList.add('chat-item');
                if (chatToken === item.token) {
                    historyItem.classList.add('active');
                }
                historyItem.innerHTML = `<div class="chat-preview"><h4>${item.question.replace(/</g, "&lt;")}</h4></div>`;
                historyItem.addEventListener('click', () => {
                    window.location.href = `../ai-chat/index.html?token=${item.token}`;
                });
                historyContainer.appendChild(historyItem);
            });
        } else {
            historyContainer.innerHTML = '<p style="padding: 1rem; text-align: center;">Chưa có lịch sử.</p>';
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        historyContainer.innerHTML = '<p style="padding: 1rem; text-align: center; color: red;">Lỗi tải lịch sử.</p>';
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
    }
}

// --- CHAT-SPECIFIC LOGIC ---
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const welcomeScreen = document.getElementById('welcomeScreen');
const charCount = document.querySelector('.char-count');
let chatToken = null;
const API_BASE_URL = 'http://localhost:5001/api/chatbot/post/question';

/**
 * Initializes the chat, getting the token from the URL.
 */
function initializeChat() {
    // Check for token in URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromParams = urlParams.get('token');
    
    if (tokenFromParams) {
        chatToken = tokenFromParams;
        if(welcomeScreen) welcomeScreen.style.display = 'none';
        if(chatMessages) chatMessages.style.display = 'flex';
        // Load chat history for this specific token
        loadChatMessages(chatToken);
        // Update URL without query params for cleaner look
        history.replaceState({ token: chatToken }, '', `../ai-chat/index.html`);
        return;
    }
    
    // Fallback: check path-based routing (for direct URL access)
    const pathParts = window.location.pathname.split('/');
    const potentialToken = pathParts[pathParts.length - 1];
    if (potentialToken && potentialToken.length > 20 && pathParts.includes('ai-chat')) {
        chatToken = potentialToken;
        if(welcomeScreen) welcomeScreen.style.display = 'none';
        if(chatMessages) chatMessages.style.display = 'flex';
        // Load chat history for this specific token
        loadChatMessages(chatToken);
    }
}

/**
 * Loads chat messages for a specific chat token
 */
async function loadChatMessages(token) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken || !token) return;

    try {
        const response = await fetch(`http://localhost:5001/api/chatbot/get/history/${token}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Chat not found, redirect to new chat
                startNewChat();
                return;
            }
            throw new Error('Failed to load chat messages');
        }

        const data = await response.json();
        
        if (data.success && data.history && data.history.length > 0) {
            // Clear existing messages
            if (chatMessages) chatMessages.innerHTML = '';
            
            // Add each message pair to the chat
            data.history.forEach(item => {
                // Add user question
                appendMessage('user', item.question);
                // Add AI answer
                appendMessage('ai', item.answer);
            });
        }
    } catch (error) {
        console.error('Error loading chat messages:', error);
        // If error loading, show welcome screen
        if(welcomeScreen) welcomeScreen.style.display = 'flex';
        if(chatMessages) chatMessages.style.display = 'none';
    }
}

/**
 * Handles sending a message.
 */
async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText.length === 0) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
        showNotification('Vui lòng đăng nhập để sử dụng tính năng này.', false)
        // Save current URL for redirect after login
                localStorage.setItem('redirect-url', window.location.href);
        // Delay redirect to show notification
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 2000);
        return;
    }

    appendMessage('user', messageText);
    messageInput.value = '';
    if(sendBtn) sendBtn.disabled = true;
    if(charCount) charCount.textContent = '0/2000';
    if(welcomeScreen) welcomeScreen.style.display = 'none';
    if(chatMessages) chatMessages.style.display = 'flex';

    showTypingIndicator(true);

    try {
        const apiUrl = chatToken ? `${API_BASE_URL}/${chatToken}` : API_BASE_URL;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ question: messageText }),
        });

        showTypingIndicator(false);

        if (response.status === 401) {
            logout(false);
            showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', false);
            // Save current URL for redirect after login
                localStorage.setItem('redirect-url', window.location.href);
            // Delay redirect to show notification
            setTimeout(() => {
                window.location.href = '../auth/login.html';
            }, 2000);
            return;
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const aiMessageTextElement = appendMessage('ai', '');
        typeResponse(aiMessageTextElement, data.answer);

        if (!chatToken && data.token) {
            chatToken = data.token;
            // Update URL to show we're in a specific chat
            history.pushState({ token: chatToken }, '', `../ai-chat/index.html?token=${chatToken}`);
            loadChatHistory();
        }
    } catch (error) {
        showTypingIndicator(false);
        console.error('Error fetching AI response:', error);
        appendMessage('ai', 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.', true);
    }
}

/**
 * Appends a message to the chat window.
 */
function appendMessage(sender, text, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender} ${isError ? 'error' : ''}`;
    const avatar = `<div class="message-avatar"><i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i></div>`;
    const textDiv = `<div class="message-text">${parseSimpleMarkdown(text)}</div>`;
    const timeDiv = `<div class="message-time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>`;
    const contentDiv = `<div class="message-content">${textDiv}${timeDiv}</div>`;
    messageDiv.innerHTML = (sender === 'user') ? contentDiv + avatar : avatar + contentDiv;
    if(chatMessages) chatMessages.appendChild(messageDiv);
    if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv.querySelector('.message-text');
}

/**
 * Shows or hides the typing indicator.
 */
function showTypingIndicator(show) {
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();
    if (show) {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message ai';
        typingDiv.innerHTML = `<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>`;
        if(chatMessages) chatMessages.appendChild(typingDiv);
        if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * Types out the AI's response.
 */
function typeResponse(element, text) {
    // For typing effect, we'll use plain text first, then apply formatting
    let index = 0;
    element.innerHTML = '';
    
    const intervalId = setInterval(() => {
        if (index < text.length) {
            // Add character by character as plain text
            const currentText = text.substring(0, index + 1);
            element.textContent = currentText;
            index++;
            if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            // Once typing is complete, apply markdown formatting
            element.innerHTML = parseSimpleMarkdown(text);
            clearInterval(intervalId);
        }
    }, 10);
}

function parseSimpleMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML first
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Apply markdown formatting
    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
        .replace(/`(.*?)`/g, '<code>$1</code>')            // Inline code
        .replace(/\n\n/g, '</p><p>')                       // Paragraphs
        .replace(/\n/g, '<br>');                           // Line breaks
    
    // Wrap in paragraph if it contains paragraph breaks
    if (formatted.includes('</p><p>')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
}

function askSampleQuestion(element) {
    const questionText = element.textContent;
    if(messageInput) messageInput.value = questionText;
    if(messageInput) messageInput.focus();
    if(sendBtn) sendBtn.disabled = false;
    if(charCount) charCount.textContent = `${questionText.length}/2000`;
}

function startNewChat() {
    // Clear current chat token and reset UI
    chatToken = null;
    if(chatMessages) chatMessages.innerHTML = '';
    if(chatMessages) chatMessages.style.display = 'none';
    if(welcomeScreen) welcomeScreen.style.display = 'flex';
    if(messageInput) messageInput.value = '';
    if(sendBtn) sendBtn.disabled = true;
    if(charCount) charCount.textContent = '0/2000';
    
    // Update URL to clean state
    history.pushState({}, '', '../ai-chat/index.html');
    
    // Reload chat history to update active state
    loadChatHistory();
}

/**
 * Toggles the sidebar visibility on mobile and desktop.
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    
    if (sidebar) {
        if (window.innerWidth <= 768) {
            // Mobile behavior
            sidebar.classList.toggle('open');
            if (overlay) {
                overlay.classList.toggle('active');
            }
        } else {
            // Desktop behavior
            sidebar.classList.toggle('collapsed');
        }
    }
}

/**
 * Toggles the sidebar collapse state on desktop.
 */
function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Basic Setup
    initializeChat();
    checkLoginStatus();

    // Event Listeners
    sendBtn?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) sendMessage();
        }
    });
    messageInput?.addEventListener('input', () => {
        const message = messageInput.value;
        if(charCount) charCount.textContent = `${message.length}/2000`;
        if(sendBtn) sendBtn.disabled = message.trim().length === 0;
    });
    // Add event listener for the logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // --- MOBILE UI IMPROVEMENTS ---
    const sidebar = document.querySelector('.sidebar');
    const sidebarHeader = document.querySelector('.sidebar-header');
    
    // Mobile sidebar header click to toggle
    sidebarHeader?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar?.classList.toggle('open');
        }
    });
    
    // Additional mobile sidebar close logic for chat area clicks
    const chatArea = document.querySelector('.chat-area');
    chatArea?.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
            const overlay = document.getElementById('mobile-sidebar-overlay');
            sidebar.classList.remove('open');
            overlay?.classList.remove('active');
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const overlay = document.getElementById('mobile-sidebar-overlay');
        if (window.innerWidth > 768) {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        }
    });
    // --- END MOBILE UI IMPROVEMENTS ---

    // Close profile dropdown if clicked outside
    window.addEventListener('click', (e) => {
        const profileMenu = document.getElementById('profile-menu');
        if (profileMenu && !profileMenu.contains(e.target)) {
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
        
        // Close mobile sidebar when clicking outside on mobile
        if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
            if (!sidebar.contains(e.target) && 
                !e.target.closest('.mobile-sidebar-toggle') && 
                !e.target.closest('.toggle-sidebar')) {
                const overlay = document.getElementById('mobile-sidebar-overlay');
                sidebar.classList.remove('open');
                overlay?.classList.remove('active');
            }
        }
    });
});
