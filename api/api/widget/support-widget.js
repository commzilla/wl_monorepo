/**
 * WeFund Support Widget - Intercom-like Customer Service Widget
 * AI-powered support chat with FAQ integration
 *
 * Usage:
 * window.WeFundSupport = {
 *   userId: 'USER_UUID',
 *   userEmail: 'user@example.com',
 *   userName: 'John',
 *   accountLogin: 'MT5_LOGIN', // optional
 *   apiBaseUrl: 'https://api.we-fund.com/api',
 *   position: 'bottom-right',
 *   primaryColor: '#24b4ff'
 * };
 */

(function() {
  'use strict';

  // Check if widget is already loaded
  if (window.WeFundSupportWidget) {
    console.warn('WeFund Support Widget already loaded');
    return;
  }

  // Get configuration
  const config = window.WeFundSupport || {};

  if (!config.userId || !config.apiBaseUrl) {
    console.error('WeFund Support Widget: Missing required configuration (userId, apiBaseUrl)');
    return;
  }

  // Remove trailing slash and /api suffix (api subdomain already routes to api app)
  let baseUrl = config.apiBaseUrl.replace(/\/$/, '').replace(/\/api$/, '');

  const settings = {
    userId: config.userId,
    userEmail: config.userEmail || '',
    userName: config.userName || 'Guest',
    accountLogin: config.accountLogin || null,
    apiBaseUrl: baseUrl,
    position: config.position || 'bottom-right',
    primaryColor: '#2596be', // Hard-coded WeFund brand color
  };

  // Widget state
  const state = {
    isOpen: false,
    currentView: 'home', // home, messages, chat, help, article
    conversations: [],
    currentConversation: null,
    conversationId: null,
    messages: [],
    faqCollections: [],
    currentArticle: null,
    isLoading: false,
    isTyping: false,
    unreadCount: 0,
    pollingInterval: null,
    showChatMenu: false,
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    pendingAttachment: null,
    isUploading: false,
    attachmentsEnabled: false
  };

  // Freeze prevention flags
  let isRendering = false;
  let renderQueued = false;
  let pollingPaused = false;
  let lastRequestId = 0;

  // Get auth token
  function getAuthToken() {
    return localStorage.getItem('client_token')
      || localStorage.getItem('access_token')
      || localStorage.getItem('access')
      || localStorage.getItem('token');
  }

  // API helper with timeout
  async function apiCall(endpoint, method = 'GET', data = null, timeout = 15000) {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const options = {
      method,
      headers,
      signal: controller.signal,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${settings.apiBaseUrl}${endpoint}`, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.detail || error.error || 'Request failed');
      }

      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    }
  }

  // SVG Icons
  const icons = {
    widget: '<img src="https://we-fund.b-cdn.net/img/68c0b9e775be3fa0d4bd90cb3a3bdf07.png" alt="Support" style="width:28px;height:28px;object-fit:contain;">',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>',
    thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    userCog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="4"></circle><path d="M16 20v-2a4 4 0 0 0-8 0v2"></path></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>'
  };

  // Create styles
  function createStyles() {
    // Load Inter font via link tag (not @import which can cause issues)
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    }

    const style = document.createElement('style');
    style.textContent = `
      .wf-widget * {
        box-sizing: border-box;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .wf-widget {
        position: fixed;
        bottom: 20px;
        ${settings.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
        z-index: 2147483647;
      }

      .wf-launcher {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${settings.primaryColor};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(37, 150, 190, 0.4);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
      }

      .wf-launcher:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(37, 150, 190, 0.5);
      }

      .wf-launcher svg,
      .wf-launcher img {
        width: 28px;
        height: 28px;
        color: white;
        transition: transform 0.3s ease;
      }

      .wf-launcher.open svg,
      .wf-launcher.open img {
        transform: rotate(90deg);
      }

      .wf-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        font-size: 12px;
        font-weight: 600;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
      }

      .wf-window {
        position: absolute;
        bottom: 80px;
        ${settings.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
        width: 380px;
        height: 600px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }

      .wf-window.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /* Header */
      .wf-header {
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        padding: 20px;
        color: white;
        position: relative;
        overflow: hidden;
      }

      .wf-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      }

      .wf-header-content {
        position: relative;
        z-index: 1;
      }

      .wf-header-back {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        margin-bottom: 12px;
        opacity: 0.9;
      }

      .wf-header-back:hover {
        opacity: 1;
      }

      .wf-header-back svg {
        width: 20px;
        height: 20px;
      }

      .wf-header-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
      }

      .wf-header-logo-icon {
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wf-header-logo-icon svg {
        width: 24px;
        height: 24px;
        color: white;
      }

      .wf-header-logo span {
        font-size: 20px;
        font-weight: 700;
      }

      .wf-header-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .wf-header-subtitle {
        font-size: 14px;
        opacity: 0.9;
      }

      /* Search */
      .wf-search {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: background 0.2s;
        margin-top: 16px;
      }

      .wf-search:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .wf-search svg {
        width: 18px;
        height: 18px;
        opacity: 0.8;
        flex-shrink: 0;
      }

      .wf-search span {
        font-size: 14px;
        opacity: 0.8;
      }

      .wf-search-input {
        flex: 1;
        background: none;
        border: none;
        color: white;
        font-size: 14px;
        outline: none;
      }

      .wf-search-input::placeholder {
        color: rgba(255, 255, 255, 0.7);
      }

      .wf-search-clear {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: white;
        opacity: 0.8;
      }

      .wf-search-clear:hover {
        opacity: 1;
      }

      .wf-search-clear svg {
        width: 16px;
        height: 16px;
      }

      /* Content */
      .wf-content {
        flex: 1;
        overflow-y: auto;
        background: #f8fafc;
      }

      .wf-content-white {
        background: white;
      }

      /* Quick Actions */
      .wf-quick-actions {
        padding: 16px;
      }

      .wf-quick-action {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: white;
        border-radius: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        border: 1px solid #e2e8f0;
        transition: all 0.2s;
      }

      .wf-quick-action:hover {
        border-color: ${settings.primaryColor};
        box-shadow: 0 2px 8px rgba(37, 150, 190, 0.1);
      }

      .wf-quick-action-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e6f7ff;
        flex-shrink: 0;
      }

      .wf-quick-action-icon svg {
        width: 20px;
        height: 20px;
        color: ${settings.primaryColor};
      }

      .wf-quick-action-text {
        flex: 1;
      }

      .wf-quick-action-title {
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 2px;
      }

      .wf-quick-action-desc {
        font-size: 13px;
        color: #64748b;
      }

      /* Primary action (chat button) */
      .wf-quick-action-primary {
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(37, 150, 190, 0.3);
      }

      .wf-quick-action-primary:hover {
        box-shadow: 0 6px 16px rgba(37, 150, 190, 0.4);
        transform: translateY(-1px);
      }

      .wf-quick-action-primary .wf-quick-action-icon {
        background: rgba(255, 255, 255, 0.2);
      }

      .wf-quick-action-primary .wf-quick-action-icon svg {
        color: white;
      }

      .wf-quick-action-primary .wf-quick-action-title {
        color: white;
      }

      .wf-quick-action-primary .wf-quick-action-desc {
        color: rgba(255, 255, 255, 0.85);
      }

      .wf-quick-action-primary .wf-quick-action-arrow {
        color: rgba(255, 255, 255, 0.8);
      }

      .wf-quick-action-arrow {
        color: #94a3b8;
      }

      .wf-quick-action-arrow svg {
        width: 20px;
        height: 20px;
      }

      /* FAQ Collections */
      .wf-faq-section {
        padding: 16px;
      }

      .wf-faq-section-title {
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 12px;
      }

      .wf-faq-collection {
        background: white;
        border-radius: 12px;
        margin-bottom: 10px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }

      .wf-faq-collection-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .wf-faq-collection-header:hover {
        background: #f8fafc;
      }

      .wf-faq-collection-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: #e6f7ff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .wf-faq-collection-icon svg {
        width: 18px;
        height: 18px;
        color: ${settings.primaryColor};
      }

      .wf-faq-collection-info {
        flex: 1;
      }

      .wf-faq-collection-title {
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
      }

      .wf-faq-collection-count {
        font-size: 13px;
        color: #64748b;
      }

      .wf-faq-collection-chevron {
        color: #94a3b8;
        transition: transform 0.2s;
      }

      .wf-faq-collection-chevron svg {
        width: 20px;
        height: 20px;
      }

      .wf-faq-collection.expanded .wf-faq-collection-chevron {
        transform: rotate(180deg);
      }

      .wf-faq-articles {
        border-top: 1px solid #e2e8f0;
        display: none;
      }

      .wf-faq-collection.expanded .wf-faq-articles {
        display: block;
      }

      .wf-faq-article {
        padding: 14px 16px 14px 64px;
        cursor: pointer;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.2s;
        font-size: 14px;
        color: #475569;
      }

      .wf-faq-article:hover {
        background: #f8fafc;
        color: ${settings.primaryColor};
      }

      .wf-faq-article:last-child {
        border-bottom: none;
      }

      /* Messages List */
      .wf-messages-list {
        padding: 16px;
      }

      .wf-message-item {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: white;
        border-radius: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        border: 1px solid #e2e8f0;
        transition: all 0.2s;
      }

      .wf-message-item:hover {
        border-color: ${settings.primaryColor};
        box-shadow: 0 2px 8px rgba(37, 150, 190, 0.1);
      }

      .wf-message-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        flex-shrink: 0;
      }

      .wf-message-content {
        flex: 1;
        min-width: 0;
      }

      .wf-message-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .wf-message-sender {
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
      }

      .wf-message-time {
        font-size: 12px;
        color: #94a3b8;
      }

      .wf-message-preview {
        font-size: 14px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .wf-empty-state {
        text-align: center;
        padding: 60px 20px;
      }

      .wf-empty-state svg {
        width: 80px;
        height: 80px;
        color: #cbd5e1;
        margin-bottom: 16px;
      }

      .wf-empty-state-title {
        font-size: 18px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 8px;
      }

      .wf-empty-state-desc {
        font-size: 14px;
        color: #94a3b8;
      }

      /* Chat View */
      .wf-chat-header {
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        padding: 16px 20px;
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
        position: relative;
      }

      .wf-chat-header-back {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.2s;
      }

      .wf-chat-header-back:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .wf-chat-header-back svg {
        width: 24px;
        height: 24px;
      }

      .wf-chat-header-info {
        flex: 1;
      }

      .wf-chat-header-title {
        font-size: 17px;
        font-weight: 600;
      }

      .wf-chat-header-status {
        font-size: 13px;
        opacity: 0.9;
      }

      .wf-chat-menu-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        transition: background 0.2s;
      }

      .wf-chat-menu-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .wf-chat-menu-btn svg {
        width: 20px;
        height: 20px;
      }

      .wf-chat-menu {
        position: absolute;
        top: 56px;
        right: 16px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        min-width: 180px;
        z-index: 100;
        overflow: hidden;
      }

      .wf-chat-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        color: #334155;
      }

      .wf-chat-menu-item:hover {
        background: #f8fafc;
      }

      .wf-chat-menu-item svg {
        width: 18px;
        height: 18px;
      }

      .wf-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        display: flex;
        flex-direction: column;
      }

      .wf-chat-message {
        display: flex;
        gap: 10px;
        margin-bottom: 12px;
        align-items: flex-end;
      }

      .wf-chat-message.user {
        flex-direction: row-reverse;
      }

      .wf-chat-message + .wf-chat-message {
        margin-top: 4px;
      }

      .wf-chat-message.user + .wf-chat-message:not(.user),
      .wf-chat-message:not(.user) + .wf-chat-message.user {
        margin-top: 16px;
      }

      .wf-chat-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .wf-chat-message.user .wf-chat-message-avatar {
        background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      }

      .wf-chat-message-content {
        display: flex;
        flex-direction: column;
        max-width: 75%;
      }

      .wf-chat-message.user .wf-chat-message-content {
        align-items: flex-end;
      }

      .wf-chat-message:not(.user) .wf-chat-message-content {
        align-items: flex-start;
      }

      .wf-chat-message-bubble {
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .wf-chat-message:not(.user) .wf-chat-message-bubble {
        background: white;
        color: #1e293b;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }

      .wf-chat-message.user .wf-chat-message-bubble {
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .wf-chat-message-timestamp {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 4px;
        padding: 0 4px;
      }

      /* AI Message Formatting */
      .wf-ai-message {
        font-size: 14.5px;
        line-height: 1.6;
      }

      .wf-ai-message p {
        margin: 0 0 8px 0;
      }

      .wf-ai-message p:last-child {
        margin-bottom: 0;
      }

      .wf-ai-message strong {
        font-weight: 600;
        color: #0f172a;
      }

      .wf-ai-message em {
        font-style: italic;
      }

      .wf-ai-list {
        margin: 8px 0;
        padding-left: 18px;
        list-style: none;
      }

      .wf-ai-list li {
        position: relative;
        margin-bottom: 6px;
        padding-left: 4px;
      }

      .wf-ai-list li:before {
        content: '•';
        position: absolute;
        left: -14px;
        color: ${settings.primaryColor};
        font-weight: bold;
      }

      .wf-ai-list li:last-child {
        margin-bottom: 0;
      }

      /* System Message Banner */
      .wf-system-banner {
        display: flex;
        justify-content: center;
        margin: 12px 0;
      }

      .wf-system-banner-content {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        color: #475569;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }

      .wf-system-banner-content svg {
        width: 16px;
        height: 16px;
        color: #16a34a;
      }

      .wf-system-banner-time {
        font-size: 11px;
        color: #94a3b8;
        margin-left: 4px;
      }

      /* Typing indicator */
      .wf-typing-bubble {
        background: white !important;
        padding: 16px 20px !important;
        min-width: 60px;
        border-bottom-left-radius: 4px !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08) !important;
      }

      .wf-typing {
        display: flex;
        gap: 5px;
        align-items: center;
        justify-content: center;
      }

      .wf-typing-dot {
        width: 8px;
        height: 8px;
        background: #94a3b8;
        border-radius: 50%;
        animation: wf-typing-bounce 1.4s ease-in-out infinite;
      }

      .wf-typing-dot:nth-child(2) { animation-delay: 0.15s; }
      .wf-typing-dot:nth-child(3) { animation-delay: 0.3s; }

      @keyframes wf-typing-bounce {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: 0.4;
        }
        30% {
          transform: translateY(-6px);
          opacity: 1;
        }
      }

      /* Chat Input */
      .wf-chat-input-area {
        padding: 16px 20px;
        background: white;
        border-top: 1px solid #e2e8f0;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
      }

      .wf-chat-input-container {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #ffffff;
        border: 2px solid #cbd5e1;
        border-radius: 24px;
        padding: 6px 8px 6px 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .wf-chat-input-container:focus-within {
        border-color: ${settings.primaryColor};
        box-shadow: 0 0 0 3px rgba(37, 150, 190, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .wf-chat-input {
        flex: 1;
        border: none;
        background: none;
        font-size: 14px;
        resize: none;
        outline: none;
        max-height: 100px;
        line-height: 1.5;
        padding: 8px 0;
        margin: 0;
      }

      .wf-chat-input::placeholder {
        color: #64748b;
      }

      .wf-chat-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #f8fafc;
      }

      .wf-chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .wf-chat-send {
        background: linear-gradient(135deg, ${settings.primaryColor} 0%, #1a7a9e 100%);
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        flex-shrink: 0;
      }

      .wf-chat-send:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(37, 150, 190, 0.3);
      }

      .wf-chat-send:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .wf-chat-send svg {
        width: 18px;
        height: 18px;
        color: white;
      }

      .wf-attachment-btn {
        background: none;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #64748b;
        transition: color 0.2s, background 0.2s;
        flex-shrink: 0;
        padding: 0;
      }

      .wf-attachment-btn:hover {
        color: ${settings.primaryColor};
        background: rgba(37, 150, 190, 0.1);
      }

      .wf-attachment-btn svg {
        width: 18px;
        height: 18px;
      }

      .wf-attachment-preview {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin: 0 20px 4px;
        background: #f1f5f9;
        border-radius: 8px;
        font-size: 13px;
        color: #334155;
      }

      .wf-attachment-preview svg {
        width: 14px;
        height: 14px;
        color: #64748b;
        flex-shrink: 0;
      }

      .wf-attachment-preview-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .wf-attachment-preview-remove {
        background: none;
        border: none;
        cursor: pointer;
        color: #94a3b8;
        font-size: 18px;
        line-height: 1;
        padding: 0 2px;
      }

      .wf-attachment-preview-remove:hover {
        color: #ef4444;
      }

      .wf-message-attachment {
        margin-top: 8px;
      }

      .wf-message-attachment img {
        max-width: 200px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        cursor: pointer;
      }

      .wf-message-attachment img:hover {
        opacity: 0.9;
      }

      .wf-message-attachment a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: ${settings.primaryColor};
        text-decoration: none;
        font-size: 13px;
      }

      .wf-message-attachment a:hover {
        text-decoration: underline;
      }

      .wf-message-attachment a svg {
        width: 14px;
        height: 14px;
      }

      /* Article View */
      .wf-article {
        padding: 20px;
      }

      .wf-article-title {
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 16px;
      }

      .wf-article-content {
        font-size: 15px;
        line-height: 1.7;
        color: #475569;
      }

      .wf-article-content p {
        margin-bottom: 16px;
      }

      .wf-article-feedback {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }

      .wf-article-feedback-title {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 12px;
      }

      .wf-article-feedback-buttons {
        display: flex;
        gap: 10px;
      }

      .wf-article-feedback-btn {
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: white;
        color: #64748b;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }

      .wf-article-feedback-btn:hover {
        border-color: ${settings.primaryColor};
        color: ${settings.primaryColor};
      }

      .wf-article-feedback-btn svg {
        width: 16px;
        height: 16px;
      }

      /* Navigation */
      .wf-nav {
        display: flex;
        border-top: 1px solid #e2e8f0;
        background: white;
      }

      .wf-nav-item {
        flex: 1;
        padding: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        background: none;
        border: none;
        transition: color 0.2s;
        color: #64748b;
      }

      .wf-nav-item:hover {
        color: ${settings.primaryColor};
      }

      .wf-nav-item.active {
        color: ${settings.primaryColor};
      }

      .wf-nav-item svg {
        width: 22px;
        height: 22px;
      }

      .wf-nav-item span {
        font-size: 12px;
        font-weight: 500;
      }

      /* Loading */
      .wf-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
      }

      .wf-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e2e8f0;
        border-top-color: ${settings.primaryColor};
        border-radius: 50%;
        animation: wf-spin 0.8s linear infinite;
      }

      @keyframes wf-spin {
        to { transform: rotate(360deg); }
      }

      /* Mobile responsive */
      @media (max-width: 420px) {
        .wf-widget {
          bottom: 10px;
          ${settings.position === 'bottom-left' ? 'left: 10px;' : 'right: 10px;'}
        }

        .wf-window {
          width: calc(100vw - 20px);
          height: calc(100vh - 100px);
          bottom: 70px;
          ${settings.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
          border-radius: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Helper functions
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { timeZone: 'Etc/GMT-2' });
  }

  function formatMessageTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const tz = 'Etc/GMT-2';
    // Compare dates in UTC+2
    const dateInTz = date.toLocaleDateString([], { timeZone: tz });
    const nowInTz = now.toLocaleDateString([], { timeZone: tz });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayInTz = yesterday.toLocaleDateString([], { timeZone: tz });

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz });

    if (dateInTz === nowInTz) {
      return time;
    } else if (dateInTz === yesterdayInTz) {
      return `Yesterday ${time}`;
    } else {
      // Show date for older messages
      const formattedDate = date.toLocaleDateString([], { day: 'numeric', month: 'short', timeZone: tz });
      return `${formattedDate} ${time}`;
    }
  }

  function formatChatMessageContent(content, senderType) {
    if (!content) return '';
    if (senderType === 'user') return escapeHtml(content);

    let formatted = escapeHtml(content);

    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Handle bullet lists
    const lines = formatted.split('\n');
    let inList = false;
    let result = [];

    for (let line of lines) {
      const trimmed = line.trim();
      const isBullet = /^[-*•]\s+/.test(trimmed);

      if (isBullet) {
        if (!inList) {
          result.push('<ul class="wf-ai-list">');
          inList = true;
        }
        result.push('<li>' + trimmed.replace(/^[-*•]\s+/, '') + '</li>');
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        if (trimmed) {
          result.push('<p>' + line + '</p>');
        }
      }
    }

    if (inList) {
      result.push('</ul>');
    }

    return result.join('');
  }

  function formatArticleContent(content) {
    if (!content) return '';
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  // API functions
  async function loadFAQs() {
    try {
      const result = await apiCall('/support/faq/list-collections/', 'POST');
      state.faqCollections = Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to load FAQs:', error);
      state.faqCollections = [];
    }
  }

  async function loadConversations() {
    state.isLoading = true;
    render();

    try {
      const result = await apiCall('/support/chat/list-conversations/', 'POST', {});
      state.conversations = Array.isArray(result) ? result : (result.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      state.conversations = [];
    } finally {
      state.isLoading = false;
      render();
    }
  }

  async function startConversation() {
    if (state.isLoading) return; // Prevent concurrent calls

    stopPolling(); // Stop any existing polling
    state.isLoading = true;
    lastRequestId++; // Invalidate pending requests
    render();
    safetyResetStuckStates();

    try {
      const payload = { user_name: settings.userName };
      if (settings.accountLogin) {
        payload.account_login = settings.accountLogin;
      }

      const result = await apiCall('/support/chat/start-conversation/', 'POST', payload);

      state.conversationId = result.conversation?.id;
      state.currentConversation = result.conversation;
      state.messages = result.messages || [];
      state.attachmentsEnabled = !!(result.conversation && result.conversation.attachments_enabled);
      state.pendingAttachment = null;

      // Add greeting if provided
      if (result.greeting && state.messages.length === 0) {
        state.messages.push({
          id: 'greeting',
          sender_type: 'ai',
          content: result.greeting,
          created_at: new Date().toISOString()
        });
      }

      state.currentView = 'chat';
      startPolling();
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      state.isLoading = false;
      render();
      scrollToBottom(); // Scroll to most recent message when starting chat
    }
  }

  async function loadConversation(conversationId) {
    if (state.isLoading) return; // Prevent concurrent calls

    stopPolling(); // Stop any existing polling
    state.isLoading = true;
    lastRequestId++; // Invalidate pending requests
    render();
    safetyResetStuckStates();

    try {
      const result = await apiCall('/support/chat/get-conversation/', 'POST', {
        conversation_id: conversationId
      });

      state.conversationId = conversationId;
      state.currentConversation = result.conversation || result || { id: conversationId };
      state.messages = result.messages || [];
      const convObj = result.conversation || result;
      state.attachmentsEnabled = !!(convObj && convObj.attachments_enabled);
      state.pendingAttachment = null;
      state.currentView = 'chat';
      startPolling();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      state.isLoading = false;
      render();
      scrollToBottom(); // Scroll to most recent message when opening chat
    }
  }

  async function uploadAttachment(file) {
    if (!state.conversationId) return;

    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf'
    ];
    const MAX_SIZE = 25 * 1024 * 1024;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('File type not allowed. Supported: images, videos, and PDFs.');
      return;
    }

    if (file.size > MAX_SIZE) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    state.isUploading = true;
    render();

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('conversation_id', state.conversationId);
      formData.append('file', file);

      const response = await fetch(`${settings.apiBaseUrl}/support/upload-attachment/`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const result = await response.json();
      state.pendingAttachment = { url: result.url, name: result.name, type: result.type };
    } catch (error) {
      console.error('Attachment upload failed:', error);
      alert(error.message || 'Failed to upload file');
    } finally {
      state.isUploading = false;
      render();
    }
  }

  let isSendingMessage = false; // Dedicated flag for message sending

  async function sendMessage(content) {
    const hasAttachment = !!state.pendingAttachment;
    if (!state.conversationId || (!content.trim() && !hasAttachment)) return;
    if (isSendingMessage) return; // Prevent concurrent sends

    const attachment = state.pendingAttachment;
    state.pendingAttachment = null; // Clear immediately

    isSendingMessage = true;
    pausePolling(); // Pause polling during message send
    safetyResetStuckStates(); // Safety net in case something goes wrong
    lastRequestId++; // Invalidate any pending polling responses

    const messageContent = content.trim() || (attachment ? `[Attachment: ${attachment.name}]` : '');

    // Add user message to UI immediately
    const tempMessage = {
      id: 'temp-' + Date.now(),
      sender_type: 'user',
      content: messageContent,
      attachment_url: attachment ? attachment.url : null,
      attachment_name: attachment ? attachment.name : null,
      attachment_type: attachment ? attachment.type : null,
      created_at: new Date().toISOString()
    };
    state.messages.push(tempMessage);
    state.isTyping = true;
    render();
    scrollToBottom();

    try {
      const result = await apiCall('/support/chat/send-message/', 'POST', {
        conversation_id: state.conversationId,
        message: messageContent,
        ...(attachment && { attachment })
      });

      // Replace temp message with real one
      state.messages = state.messages.filter(m => m.id !== tempMessage.id);

      if (result.user_message) {
        state.messages.push(result.user_message);
      } else {
        state.messages.push(tempMessage);
      }

      if (result.ai_response) {
        state.messages.push(result.ai_response);
      }

      // Show escalation message only if there was no AI response already covering it
      if (result.escalated && !result.ai_response) {
        state.messages.push({
          id: 'escalation-' + Date.now(),
          sender_type: 'ai',
          content: "I've connected you with a support agent who will assist you shortly.",
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      state.messages = state.messages.filter(m => m.id !== tempMessage.id);
      state.messages.push({
        id: 'error-' + Date.now(),
        sender_type: 'ai',
        content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        created_at: new Date().toISOString()
      });
    } finally {
      state.isTyping = false;
      isSendingMessage = false; // Always reset
      state.isLoading = false; // Ensure loading is also reset
      resumePolling(); // Resume polling after message send
      render();
      scrollToBottom();

      // Focus input after render
      setTimeout(() => {
        const input = document.getElementById('wf-chat-input');
        if (input) input.focus();
      }, 100);
    }
  }

  let isPollingInProgress = false;

  function startPolling() {
    stopPolling();
    state.pollingInterval = setInterval(async () => {
      // Skip if paused, already polling, or not in chat view
      if (pollingPaused || isPollingInProgress || !state.conversationId || state.currentView !== 'chat') {
        return;
      }

      // Skip if any operation is in progress
      if (state.isLoading || state.isTyping || isSendingMessage) {
        return;
      }

      isPollingInProgress = true;
      const requestId = ++lastRequestId;

      try {
        const result = await apiCall('/support/chat/get-conversation/', 'POST', {
          conversation_id: state.conversationId
        });

        // Ignore stale responses
        if (requestId !== lastRequestId) return;

        // Track attachments_enabled changes from conversation
        // get-conversation returns flat data (not nested under .conversation)
        const convData = result.conversation || result;
        if (convData.attachments_enabled !== undefined) {
          const newVal = !!convData.attachments_enabled;
          if (newVal !== state.attachmentsEnabled) {
            state.attachmentsEnabled = newVal;
            if (!newVal) state.pendingAttachment = null;
            render();
          }
        }

        if (result.messages && result.messages.length > state.messages.length) {
          state.messages = result.messages;
          render();
          scrollToBottom();
        }
      } catch (error) {
        // Silently ignore polling errors - don't spam console
        if (error.message !== 'Request timed out') {
          console.error('Polling error:', error);
        }
      } finally {
        isPollingInProgress = false;
      }
    }, 3000);
  }

  function stopPolling() {
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      state.pollingInterval = null;
    }
    isPollingInProgress = false;
  }

  function pausePolling() {
    pollingPaused = true;
  }

  function resumePolling() {
    pollingPaused = false;
  }

  function scrollToBottom() {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.wf-chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  // Render functions with lock to prevent concurrent renders
  function render() {
    // If already rendering, queue a re-render instead of blocking
    if (isRendering) {
      renderQueued = true;
      return;
    }

    isRendering = true;

    try {
      const container = document.getElementById('wf-support-widget');
      if (!container) {
        isRendering = false;
        return;
      }

      container.innerHTML = `
        <div class="wf-widget">
          <button class="wf-launcher ${state.isOpen ? 'open' : ''}" onclick="WeFundSupportWidget.toggle()">
            ${state.isOpen ? icons.close : icons.widget}
            ${!state.isOpen && state.unreadCount > 0 ? `<span class="wf-badge">${state.unreadCount}</span>` : ''}
          </button>
          <div class="wf-window ${state.isOpen ? 'open' : ''}">
            ${renderContent()}
          </div>
        </div>
      `;

      attachEventListeners();
    } catch (err) {
      console.error('Render error:', err);
    } finally {
      isRendering = false;

      // Process queued render
      if (renderQueued) {
        renderQueued = false;
        setTimeout(render, 10);
      }
    }
  }

  function renderContent() {
    switch (state.currentView) {
      case 'home':
        return renderHomeView();
      case 'messages':
        return renderMessagesView();
      case 'chat':
        return renderChatView();
      case 'help':
        return renderHelpView();
      case 'article':
        return renderArticleView();
      default:
        return renderHomeView();
    }
  }

  function renderHomeView() {
    const greeting = settings.userName ? `Hi ${escapeHtml(settings.userName)} 👋` : 'Hi there 👋';

    return `
      <div class="wf-header">
        <div class="wf-header-content">
          <div class="wf-header-logo" onclick="WeFundSupportWidget.reset()" style="cursor:pointer;" title="Click to reset widget">
            <img src="https://we-fund.b-cdn.net/img/d89cb1c6-c469-4a2c-986a-5a4f0b4ff0fa.png" alt="WeHelp" style="width:32px;height:32px;object-fit:contain;">
            <span>WeHelp</span>
          </div>
          <div class="wf-header-title">${greeting}</div>
          <div class="wf-header-subtitle">How can we help you today?</div>
          <div class="wf-search" onclick="WeFundSupportWidget.navigate('help')">
            ${icons.search}
            <span>Search for help</span>
          </div>
        </div>
      </div>
      <div class="wf-content">
        <div class="wf-quick-actions">
          <div class="wf-quick-action wf-quick-action-primary" onclick="WeFundSupportWidget.startChat()">
            <div class="wf-quick-action-icon">
              <img src="https://we-fund.b-cdn.net/img/d89cb1c6-c469-4a2c-986a-5a4f0b4ff0fa.png" alt="" style="width:24px;height:24px;object-fit:contain;">
            </div>
            <div class="wf-quick-action-text">
              <div class="wf-quick-action-title">Ask a question</div>
              <div class="wf-quick-action-desc">WeHelp AI is here to help</div>
            </div>
            <div class="wf-quick-action-arrow">${icons.chevronRight}</div>
          </div>
          ${state.faqCollections.slice(0, 3).map(collection => `
            <div class="wf-quick-action" onclick="WeFundSupportWidget.openCollection('${collection.id}')">
              <div class="wf-quick-action-icon">
                ${icons.book}
              </div>
              <div class="wf-quick-action-text">
                <div class="wf-quick-action-title">${escapeHtml(collection.title || collection.name)}</div>
                <div class="wf-quick-action-desc">${collection.article_count || 0} articles</div>
              </div>
              <div class="wf-quick-action-arrow">${icons.chevronRight}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${renderNavigation('home')}
    `;
  }

  function renderMessagesView() {
    return `
      <div class="wf-header">
        <div class="wf-header-content">
          <div class="wf-header-title">Messages</div>
          <div class="wf-header-subtitle">Your conversation history</div>
        </div>
      </div>
      <div class="wf-content">
        ${state.isLoading ? `
          <div class="wf-loading">
            <div class="wf-spinner"></div>
          </div>
        ` : state.conversations.length === 0 ? `
          <div class="wf-empty-state">
            ${icons.inbox}
            <div class="wf-empty-state-title">No messages yet</div>
            <div class="wf-empty-state-desc">Start a conversation with our support team</div>
          </div>
          <div class="wf-quick-actions" style="padding-top: 0;">
            <div class="wf-quick-action wf-quick-action-primary" onclick="WeFundSupportWidget.startChat()">
              <div class="wf-quick-action-icon">
                <img src="https://we-fund.b-cdn.net/img/d89cb1c6-c469-4a2c-986a-5a4f0b4ff0fa.png" alt="" style="width:24px;height:24px;object-fit:contain;">
              </div>
              <div class="wf-quick-action-text">
                <div class="wf-quick-action-title">Ask a question</div>
                <div class="wf-quick-action-desc">Get help from WeHelp AI</div>
              </div>
              <div class="wf-quick-action-arrow">${icons.chevronRight}</div>
            </div>
          </div>
        ` : `
          <div class="wf-messages-list">
            ${state.conversations.map(conv => `
              <div class="wf-message-item" onclick="WeFundSupportWidget.openConversation('${conv.id}')">
                <div class="wf-message-avatar">WF</div>
                <div class="wf-message-content">
                  <div class="wf-message-header">
                    <span class="wf-message-sender">WeHelp Support</span>
                    <span class="wf-message-time">${formatTime(conv.last_message_at || conv.updated_at || conv.created_at)}</span>
                  </div>
                  <div class="wf-message-preview">${escapeHtml(conv.last_message?.content || conv.last_message || 'Start chatting...')}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      ${renderNavigation('messages')}
    `;
  }

  function renderChatView() {
    return `
      <div class="wf-chat-header">
        <button class="wf-chat-header-back" onclick="WeFundSupportWidget.navigate('messages')">
          ${icons.back}
        </button>
        <div class="wf-chat-header-info">
          <div class="wf-chat-header-title">WeHelp Support</div>
          <div class="wf-chat-header-status">We typically reply instantly</div>
        </div>
        <button class="wf-chat-menu-btn" onclick="WeFundSupportWidget.toggleChatMenu(event)">
          ${icons.menu}
        </button>
        ${state.showChatMenu ? `
          <div class="wf-chat-menu">
            <button class="wf-chat-menu-item" onclick="WeFundSupportWidget.exportChat()">
              ${icons.download}
              Export chat
            </button>
          </div>
        ` : ''}
      </div>
      <div class="wf-chat-messages">
        ${state.messages.map(msg => {
          const metadata = msg.metadata || {};
          const eventType = metadata.event_type;
          const isSystemMessage = eventType === 'agent_joined' || eventType === 'agent_left';

          if (isSystemMessage) {
            return `
              <div class="wf-system-banner">
                <div class="wf-system-banner-content">
                  ${icons.userCog}
                  <span>${escapeHtml(msg.content)}</span>
                  <span class="wf-system-banner-time">${formatMessageTime(msg.created_at)}</span>
                </div>
              </div>
            `;
          }

          const senderType = msg.sender_type || 'ai';
          const displayContent = (senderType !== 'user' && metadata.translated_content)
            ? metadata.translated_content
            : msg.content;

          let attachmentHtml = '';
          if (msg.attachment_url) {
            if (msg.attachment_type && msg.attachment_type.startsWith('image/')) {
              attachmentHtml = `<div class="wf-message-attachment"><a href="${escapeHtml(msg.attachment_url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(msg.attachment_url)}" alt="${escapeHtml(msg.attachment_name || 'Attachment')}"></a></div>`;
            } else if (msg.attachment_type && msg.attachment_type.startsWith('video/')) {
              attachmentHtml = `<div class="wf-message-attachment"><video src="${escapeHtml(msg.attachment_url)}" controls style="max-width:200px;border-radius:8px;"></video></div>`;
            } else {
              attachmentHtml = `<div class="wf-message-attachment"><a href="${escapeHtml(msg.attachment_url)}" target="_blank" rel="noopener noreferrer">${icons.paperclip} ${escapeHtml(msg.attachment_name || 'Attachment')}</a></div>`;
            }
          }

          return `
            <div class="wf-chat-message ${senderType === 'user' ? 'user' : ''}">
              <div class="wf-chat-message-avatar">
                ${senderType === 'user' ? (settings.userName ? settings.userName.charAt(0).toUpperCase() : 'U') : 'WF'}
              </div>
              <div class="wf-chat-message-content">
                <div class="wf-chat-message-bubble ${senderType !== 'user' ? 'wf-ai-message' : ''}">${formatChatMessageContent(displayContent, senderType)}${attachmentHtml}</div>
                <div class="wf-chat-message-timestamp">${formatMessageTime(msg.created_at)}</div>
              </div>
            </div>
          `;
        }).join('')}
        ${state.isTyping ? `
          <div class="wf-chat-message">
            <div class="wf-chat-message-avatar">WF</div>
            <div class="wf-chat-message-content">
              <div class="wf-chat-message-bubble wf-typing-bubble">
                <div class="wf-typing">
                  <div class="wf-typing-dot"></div>
                  <div class="wf-typing-dot"></div>
                  <div class="wf-typing-dot"></div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      ${state.pendingAttachment ? `
        <div class="wf-attachment-preview">
          ${icons.paperclip}
          <span class="wf-attachment-preview-name">${escapeHtml(state.pendingAttachment.name)}</span>
          <button class="wf-attachment-preview-remove" onclick="WeFundSupportWidget.removeAttachment()">&times;</button>
        </div>
      ` : ''}
      <div class="wf-chat-input-area">
        <div class="wf-chat-input-container">
          ${state.attachmentsEnabled ? `
            <button class="wf-attachment-btn" onclick="WeFundSupportWidget.selectFile()" title="Attach file" ${state.isUploading ? 'disabled' : ''}>
              ${state.isUploading ? '<div class="wf-spinner" style="width:18px;height:18px;border-width:2px;"></div>' : icons.paperclip}
            </button>
            <input type="file" id="wf-file-input" style="display:none" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf" onchange="WeFundSupportWidget.handleFileSelect(this)">
          ` : ''}
          <textarea
            class="wf-chat-input"
            id="wf-chat-input"
            placeholder="${isSendingMessage ? 'AI is typing...' : 'Type your message...'}"
            rows="1"
            ${isSendingMessage ? 'disabled' : ''}
          ></textarea>
          <button class="wf-chat-send" onclick="WeFundSupportWidget.sendMessage()" ${isSendingMessage ? 'disabled' : ''}>
            ${icons.send}
          </button>
        </div>
      </div>
    `;
  }

  function renderHelpView() {
    const showingResults = state.searchQuery && state.searchQuery.length >= 2;

    return `
      <div class="wf-header">
        <div class="wf-header-content">
          <button class="wf-header-back" onclick="WeFundSupportWidget.navigate('home')">
            ${icons.back} Back
          </button>
          <div class="wf-header-title">Help Center</div>
          <div class="wf-search">
            <input
              type="text"
              class="wf-search-input"
              id="wf-search-input"
              placeholder="Search for help..."
              value="${escapeHtml(state.searchQuery)}"
              oninput="WeFundSupportWidget.handleSearch(this.value)"
            />
            ${state.searchQuery ? `<button class="wf-search-clear" onclick="WeFundSupportWidget.clearSearch()">${icons.x}</button>` : icons.search}
          </div>
        </div>
      </div>
      <div class="wf-content">
        ${state.isSearching ? `
          <div class="wf-loading">
            <div class="wf-spinner"></div>
          </div>
        ` : showingResults ? `
          <div class="wf-faq-section">
            <div class="wf-faq-section-title">${state.searchResults.length} Results for "${escapeHtml(state.searchQuery)}"</div>
            ${state.searchResults.length === 0 ? `
              <div style="text-align:center;padding:40px 20px;color:#64748b;">
                <p>No articles found matching your search.</p>
                <p style="font-size:13px;margin-top:8px;">Try different keywords or browse the collections below.</p>
              </div>
            ` : state.searchResults.map(article => `
              <div class="wf-faq-collection" style="margin-bottom:8px;">
                <div class="wf-faq-collection-header" onclick="WeFundSupportWidget.openSearchArticle('${article.id}')">
                  <div class="wf-faq-collection-icon">${icons.book}</div>
                  <div class="wf-faq-collection-info">
                    <div class="wf-faq-collection-title">${escapeHtml(article.title)}</div>
                    <div class="wf-faq-collection-count">${escapeHtml(article.collection_title || '')}</div>
                  </div>
                  <div class="wf-faq-collection-chevron">${icons.chevronRight}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="wf-faq-section">
            <div class="wf-faq-section-title">${state.faqCollections.length} Collections</div>
            ${state.faqCollections.map(collection => `
              <div class="wf-faq-collection ${collection.expanded ? 'expanded' : ''}">
                <div class="wf-faq-collection-header" onclick="WeFundSupportWidget.toggleCollection('${collection.id}')">
                  <div class="wf-faq-collection-icon">${icons.book}</div>
                  <div class="wf-faq-collection-info">
                    <div class="wf-faq-collection-title">${escapeHtml(collection.title || collection.name)}</div>
                    <div class="wf-faq-collection-count">${collection.article_count || 0} articles</div>
                  </div>
                  <div class="wf-faq-collection-chevron">${icons.chevronDown}</div>
                </div>
                <div class="wf-faq-articles">
                  ${(collection.articles || []).map(article => `
                    <div class="wf-faq-article" onclick="WeFundSupportWidget.openArticle('${article.id}')">${escapeHtml(article.title)}</div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      ${renderNavigation('help')}
    `;
  }

  function renderArticleView() {
    if (!state.currentArticle) return renderHelpView();

    return `
      <div class="wf-header">
        <div class="wf-header-content">
          <button class="wf-header-back" onclick="WeFundSupportWidget.navigate('help')">
            ${icons.back} Back
          </button>
          <div class="wf-header-title">${escapeHtml(state.currentArticle.collection_title || 'Help Center')}</div>
        </div>
      </div>
      <div class="wf-content wf-content-white">
        <div class="wf-article">
          <h1 class="wf-article-title">${escapeHtml(state.currentArticle.title)}</h1>
          <div class="wf-article-content">
            <p>${formatArticleContent(state.currentArticle.content)}</p>
          </div>
          <div class="wf-article-feedback">
            <div class="wf-article-feedback-title">Was this article helpful?</div>
            <div class="wf-article-feedback-buttons">
              <button class="wf-article-feedback-btn" onclick="WeFundSupportWidget.rateArticle('${state.currentArticle.id}', true)">
                ${icons.thumbsUp} Yes
              </button>
              <button class="wf-article-feedback-btn" onclick="WeFundSupportWidget.rateArticle('${state.currentArticle.id}', false)">
                ${icons.thumbsDown} No
              </button>
            </div>
          </div>
        </div>
      </div>
      ${renderNavigation('help')}
    `;
  }

  function renderNavigation(active) {
    return `
      <nav class="wf-nav">
        <button class="wf-nav-item ${active === 'home' ? 'active' : ''}" onclick="WeFundSupportWidget.navigate('home')">
          ${icons.home}
          <span>Home</span>
        </button>
        <button class="wf-nav-item ${active === 'messages' ? 'active' : ''}" onclick="WeFundSupportWidget.navigate('messages')">
          ${icons.messages}
          <span>Messages</span>
        </button>
        <button class="wf-nav-item ${active === 'help' ? 'active' : ''}" onclick="WeFundSupportWidget.navigate('help')">
          ${icons.help}
          <span>Help</span>
        </button>
      </nav>
    `;
  }

  // Track attached listeners to prevent duplicates
  let documentClickListenerAttached = false;
  let currentChatInputElement = null;

  function attachEventListeners() {
    const chatInput = document.getElementById('wf-chat-input');

    // Only attach chat input listeners if it's a new element
    if (chatInput && chatInput !== currentChatInputElement) {
      currentChatInputElement = chatInput;

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.WeFundSupportWidget.sendMessage();
        }
      });

      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
      });
    }

    // Only attach document click listener once
    if (!documentClickListenerAttached) {
      documentClickListenerAttached = true;
      document.addEventListener('click', (e) => {
        if (state.showChatMenu && !e.target.closest('.wf-chat-menu') && !e.target.closest('.wf-chat-menu-btn')) {
          state.showChatMenu = false;
          render();
        }
      });
    }
  }

  // Debounce helper to prevent rapid clicks
  let lastActionTime = 0;
  const DEBOUNCE_MS = 300;

  function canPerformAction() {
    const now = Date.now();
    if (now - lastActionTime < DEBOUNCE_MS) {
      return false;
    }
    lastActionTime = now;
    return true;
  }

  // Safety timeout to reset stuck states
  function safetyResetStuckStates() {
    setTimeout(() => {
      if (state.isLoading || state.isTyping || state.isSearching || isSendingMessage || pollingPaused || isRendering) {
        console.warn('Safety reset: clearing stuck states');
        state.isLoading = false;
        state.isTyping = false;
        state.isSearching = false;
        isSendingMessage = false;
        isRendering = false;
        renderQueued = false;
        pollingPaused = false;
        isPollingInProgress = false;
        render();
      }
    }, 15000); // 15 second safety timeout (reduced from 30s)
  }

  // Public API
  window.WeFundSupportWidget = {
    toggle() {
      if (!canPerformAction()) return;

      state.isOpen = !state.isOpen;
      if (state.isOpen) {
        loadFAQs();
        loadConversations();
      } else {
        stopPolling();
      }
      render();
    },

    open() {
      if (!state.isOpen) {
        this.toggle();
      }
    },

    close() {
      if (state.isOpen) {
        this.toggle();
      }
    },

    navigate(view) {
      stopPolling();
      // Clear any stuck loading/typing states
      state.isLoading = false;
      state.isTyping = false;
      state.isSearching = false;
      state.currentView = view;
      state.currentArticle = null;

      if (view === 'messages') {
        loadConversations();
      }

      render();
    },

    // Reset widget to initial state (recovery from frozen state)
    reset() {
      console.log('Widget reset triggered');
      stopPolling();

      // Reset all state flags
      state.isLoading = false;
      state.isTyping = false;
      state.isSearching = false;
      state.currentView = 'home';
      state.currentArticle = null;
      state.showChatMenu = false;
      state.searchQuery = '';
      state.searchResults = [];

      // Reset all freeze prevention flags
      isSendingMessage = false;
      isRendering = false;
      renderQueued = false;
      pollingPaused = false;
      isPollingInProgress = false;
      lastRequestId++;

      loadFAQs();
      render();
    },

    startChat() {
      if (!canPerformAction()) return;
      if (state.isLoading) return; // Prevent double-click while loading
      startConversation();
    },

    openConversation(id) {
      if (!canPerformAction()) return;
      if (state.isLoading) return;
      loadConversation(id);
    },

    async sendMessage() {
      const input = document.getElementById('wf-chat-input');
      const messageText = input?.value?.trim() || '';

      if (!messageText && !state.pendingAttachment) return;

      // Clear input immediately for better UX
      if (input) {
        input.value = '';
        input.style.height = 'auto';
      }

      await sendMessage(messageText);
    },

    selectFile() {
      const fileInput = document.getElementById('wf-file-input');
      if (fileInput) fileInput.click();
    },

    handleFileSelect(input) {
      const file = input?.files?.[0];
      if (file) {
        uploadAttachment(file);
        input.value = '';
      }
    },

    removeAttachment() {
      state.pendingAttachment = null;
      render();
    },

    toggleCollection(id) {
      const collection = state.faqCollections.find(c => c.id === id);
      if (collection) {
        collection.expanded = !collection.expanded;

        // Preserve scroll position
        const content = document.querySelector('.wf-content');
        const scrollTop = content ? content.scrollTop : 0;

        if (collection.expanded && !collection.articles) {
          // Load articles for this collection
          apiCall('/support/faq/get-collection/', 'POST', { collection_id: id })
            .then(result => {
              collection.articles = result.articles || [];
              render();
              // Restore scroll position after articles load
              const newContent = document.querySelector('.wf-content');
              if (newContent) newContent.scrollTop = scrollTop;
            })
            .catch(console.error);
        }

        render();
        // Restore scroll position
        const newContent = document.querySelector('.wf-content');
        if (newContent) newContent.scrollTop = scrollTop;
      }
    },

    openCollection(id) {
      state.currentView = 'help';
      render();

      setTimeout(() => {
        this.toggleCollection(id);
      }, 100);
    },

    openArticle(id) {
      for (const collection of state.faqCollections) {
        if (collection.articles) {
          const article = collection.articles.find(a => a.id === id);
          if (article) {
            state.currentArticle = {
              ...article,
              collection_title: collection.title || collection.name
            };
            state.currentView = 'article';
            render();
            // Track view
            apiCall('/support/faq/track-view/', 'POST', { article_id: id }).catch(() => {});
            return;
          }
        }
      }
    },

    openSearchArticle(id) {
      const article = state.searchResults.find(a => a.id === id);
      if (article) {
        state.currentArticle = article;
        state.currentView = 'article';
        render();
        // Track view
        apiCall('/support/faq/track-view/', 'POST', { article_id: id }).catch(() => {});
      }
    },

    rateArticle(id, helpful) {
      apiCall('/support/faq/track-helpful/', 'POST', { article_id: id, helpful })
        .then(() => {
          const buttons = document.querySelector('.wf-article-feedback-buttons');
          if (buttons) {
            buttons.innerHTML = '<p style="color: #64748b; font-size: 14px;">Thanks for your feedback!</p>';
          }
        })
        .catch(err => {
          console.error('Failed to submit feedback:', err);
          const buttons = document.querySelector('.wf-article-feedback-buttons');
          if (buttons) {
            buttons.innerHTML = '<p style="color: #ef4444; font-size: 14px;">Failed to submit. Please try again.</p>';
          }
        });
    },

    toggleChatMenu(e) {
      if (e) e.stopPropagation();
      state.showChatMenu = !state.showChatMenu;
      render();
    },

    async exportChat() {
      if (!state.conversationId) return;

      state.showChatMenu = false;
      render();

      // Generate text export
      let text = 'WeHelp Support Chat Export\n';
      text += '========================\n\n';

      state.messages.forEach(msg => {
        const time = formatMessageTime(msg.created_at);
        const sender = msg.sender_type === 'user' ? 'You' : 'WeHelp Support';
        text += `[${time}] ${sender}:\n${msg.content}\n\n`;
      });

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wefund-chat-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    searchTimeout: null,

    handleSearch(query) {
      state.searchQuery = query;

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Helper to restore focus after render
      const restoreFocus = () => {
        setTimeout(() => {
          const input = document.getElementById('wf-search-input');
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }, 0);
      };

      if (query.length < 2) {
        state.searchResults = [];
        state.isSearching = false;
        render();
        restoreFocus();
        return;
      }

      state.isSearching = true;
      render();
      restoreFocus();

      this.searchTimeout = setTimeout(async () => {
        try {
          const results = await apiCall('/support/faq/search/', 'POST', { query });
          state.searchResults = Array.isArray(results) ? results : [];
        } catch (error) {
          console.error('Search failed:', error);
          state.searchResults = [];
        } finally {
          state.isSearching = false;
          render();
          restoreFocus();
        }
      }, 300);
    },

    clearSearch() {
      state.searchQuery = '';
      state.searchResults = [];
      state.isSearching = false;
      render();
    }
  };

  // Initialize widget
  function init() {
    try {
      // Check if container already exists (prevent duplicate initialization)
      if (document.getElementById('wf-support-widget')) {
        console.warn('WeFund Support Widget container already exists');
        return;
      }

      createStyles();

      const container = document.createElement('div');
      container.id = 'wf-support-widget';
      document.body.appendChild(container);

      render();

      console.log('WeFund Support Widget initialized');
    } catch (error) {
      console.error('WeFund Support Widget initialization error:', error);
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure page is fully ready
    setTimeout(init, 100);
  }

})();
