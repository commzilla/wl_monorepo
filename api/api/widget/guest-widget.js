/**
 * WeFund Guest Chat Widget
 * Embeddable chat widget for unauthenticated website visitors.
 *
 * Usage:
 *   <script>
 *     window.WeFundGuestChat = { apiBaseUrl: 'https://api.we-fund.com/api' };
 *   </script>
 *   <script src="https://api.we-fund.com/api/support/guest-widget.js" async></script>
 */
(function () {
  'use strict';

  // ─── Configuration ───────────────────────────────────────────
  var cfg = window.WeFundGuestChat || {};
  var API_BASE = (cfg.apiBaseUrl || '').replace(/\/+$/, '');
  if (!API_BASE) {
    console.error('[WeFundGuestChat] apiBaseUrl is required');
    return;
  }

  var BRAND_COLOR = cfg.brandColor || '#2596be';
  var BRAND_DARK = cfg.brandDark || '#1d7a9e';
  var POSITION = cfg.position || 'right'; // 'right' or 'left'
  var POLL_INTERVAL = 5000; // ms
  var STORAGE_KEY = 'wefund_guest_chat';
  var Z_INDEX = 999999;

  // ─── State ───────────────────────────────────────────────────
  var state = {
    open: false,
    view: 'prechat', // 'prechat' | 'chat'
    sessionToken: null,
    conversationId: null,
    guestName: '',
    guestEmail: '',
    messages: [],
    sending: false,
    pollTimer: null,
    attachmentsEnabled: false,
    pendingAttachment: null,
    isUploading: false,
  };

  // ─── Helpers ─────────────────────────────────────────────────
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  function api(endpoint, body) {
    return fetch(API_BASE + '/support/guest-chat/' + endpoint + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (r.status === 429) throw new Error('rate_limited');
      if (!r.ok) throw new Error('api_error_' + r.status);
      return r.json();
    });
  }

  function saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionToken: state.sessionToken,
        conversationId: state.conversationId,
        guestName: state.guestName,
        guestEmail: state.guestEmail,
      }));
    } catch (e) { /* localStorage unavailable */ }
  }

  function loadSession() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && data.sessionToken) {
        state.sessionToken = data.sessionToken;
        state.conversationId = data.conversationId;
        state.guestName = data.guestName || '';
        state.guestEmail = data.guestEmail || '';
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function clearSession() {
    state.sessionToken = null;
    state.conversationId = null;
    state.messages = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(isoStr) {
    try {
      var d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Etc/GMT-2' });
    } catch (e) { return ''; }
  }

  // ─── Inject Styles ──────────────────────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = ''
      + '#wf-guest-chat-bubble {'
      + '  position:fixed;bottom:20px;' + POSITION + ':20px;z-index:' + Z_INDEX + ';'
      + '  width:60px;height:60px;border-radius:50%;background:' + BRAND_COLOR + ';'
      + '  cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);'
      + '  display:flex;align-items:center;justify-content:center;'
      + '  transition:transform .2s,box-shadow .2s;'
      + '}'
      + '#wf-guest-chat-bubble:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,0.3)}'
      + '#wf-guest-chat-bubble svg{width:28px;height:28px;fill:#fff}'
      + '#wf-guest-chat-bubble img{width:28px;height:28px;object-fit:contain}'
      + '#wf-guest-chat-window {'
      + '  position:fixed;bottom:90px;' + POSITION + ':20px;z-index:' + Z_INDEX + ';'
      + '  width:380px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);'
      + '  background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.2);'
      + '  display:none;flex-direction:column;overflow:hidden;'
      + '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:#1a1a1a;'
      + '}'
      + '#wf-guest-chat-window.wf-open{display:flex}'
      // Header
      + '.wf-gc-header{'
      + '  background:' + BRAND_COLOR + ';color:#fff;padding:16px 18px;'
      + '  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;'
      + '}'
      + '.wf-gc-header h3{margin:0;font-size:16px;font-weight:600}'
      + '.wf-gc-header-sub{margin:0;font-size:12px;opacity:.85;margin-top:2px}'
      + '.wf-gc-close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;font-size:20px;line-height:1}'
      // Pre-chat form
      + '.wf-gc-prechat{flex:1;display:flex;flex-direction:column;justify-content:center;padding:30px 24px}'
      + '.wf-gc-prechat h4{margin:0 0 4px;font-size:18px;font-weight:600;color:#1a1a1a}'
      + '.wf-gc-prechat p{margin:0 0 20px;color:#666;font-size:13px}'
      + '.wf-gc-input{'
      + '  width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;'
      + '  margin-bottom:12px;box-sizing:border-box;outline:none;transition:border-color .2s;'
      + '}'
      + '.wf-gc-input:focus{border-color:' + BRAND_COLOR + '}'
      + '.wf-gc-btn{'
      + '  width:100%;padding:12px;background:' + BRAND_COLOR + ';color:#fff;border:none;'
      + '  border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s;'
      + '}'
      + '.wf-gc-btn:hover{background:' + BRAND_DARK + '}'
      + '.wf-gc-btn:disabled{opacity:.6;cursor:not-allowed}'
      // Chat area
      + '.wf-gc-chat{flex:1;display:flex;flex-direction:column;overflow:hidden}'
      + '.wf-gc-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}'
      + '.wf-gc-msg{max-width:85%;padding:10px 14px;border-radius:12px;line-height:1.45;word-wrap:break-word;white-space:pre-wrap}'
      + '.wf-gc-msg-user{background:' + BRAND_COLOR + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}'
      + '.wf-gc-msg-ai{background:#f0f0f0;color:#1a1a1a;align-self:flex-start;border-bottom-left-radius:4px}'
      + '.wf-gc-msg-agent{background:#e8f4fd;color:#1a1a1a;align-self:flex-start;border-bottom-left-radius:4px}'
      + '.wf-gc-msg-time{font-size:11px;opacity:.6;margin-top:4px}'
      // Typing indicator
      + '.wf-gc-typing{align-self:flex-start;padding:10px 14px;background:#f0f0f0;border-radius:12px;display:none;align-items:center;gap:4px}'
      + '.wf-gc-typing.wf-show{display:flex}'
      + '.wf-gc-dot{width:6px;height:6px;border-radius:50%;background:#999;animation:wf-bounce 1.4s infinite both}'
      + '.wf-gc-dot:nth-child(2){animation-delay:.16s}'
      + '.wf-gc-dot:nth-child(3){animation-delay:.32s}'
      + '@keyframes wf-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}'
      // Input bar
      + '.wf-gc-inputbar{display:flex;padding:12px;border-top:1px solid #eee;gap:8px;flex-shrink:0}'
      + '.wf-gc-inputbar input{'
      + '  flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:20px;font-size:14px;outline:none;'
      + '}'
      + '.wf-gc-inputbar input:focus{border-color:' + BRAND_COLOR + '}'
      + '.wf-gc-inputbar input:disabled{opacity:.6;cursor:not-allowed;background:#f8fafc}'
      + '.wf-gc-send{'
      + '  width:40px;height:40px;border-radius:50%;background:' + BRAND_COLOR + ';border:none;'
      + '  cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s;'
      + '}'
      + '.wf-gc-send:hover{background:' + BRAND_DARK + '}'
      + '.wf-gc-send:disabled{opacity:.5;cursor:not-allowed}'
      + '.wf-gc-send svg{width:18px;height:18px;fill:#fff}'
      // Error toast
      + '.wf-gc-error{background:#fee;color:#c00;padding:8px 14px;font-size:12px;text-align:center;display:none}'
      + '.wf-gc-error.wf-show{display:block}'
      // Powered-by
      + '.wf-gc-powered{text-align:center;padding:6px;font-size:11px;color:#aaa;flex-shrink:0}'
      + '.wf-gc-powered a{color:#888;text-decoration:none}'
      // Attachment button
      + '.wf-gc-attach-btn{'
      + '  width:36px;height:36px;border-radius:50%;background:none;border:none;'
      + '  cursor:pointer;display:flex;align-items:center;justify-content:center;'
      + '  color:#64748b;transition:color .2s,background .2s;flex-shrink:0;padding:0;'
      + '}'
      + '.wf-gc-attach-btn:hover{color:' + BRAND_COLOR + ';background:rgba(37,150,190,0.1)}'
      + '.wf-gc-attach-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}'
      // Attachment preview
      + '.wf-gc-attach-preview{'
      + '  display:flex;align-items:center;gap:8px;padding:6px 12px;margin:0 12px 4px;'
      + '  background:#f1f5f9;border-radius:8px;font-size:12px;color:#334155;'
      + '}'
      + '.wf-gc-attach-preview svg{width:14px;height:14px;flex-shrink:0;fill:none;stroke:#64748b;stroke-width:2}'
      + '.wf-gc-attach-preview-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.wf-gc-attach-preview-rm{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;padding:0 2px}'
      + '.wf-gc-attach-preview-rm:hover{color:#ef4444}'
      // Message attachment
      + '.wf-gc-msg-attachment{margin-top:6px}'
      + '.wf-gc-msg-attachment img{max-width:180px;border-radius:6px;border:1px solid #e2e8f0;cursor:pointer}'
      + '.wf-gc-msg-attachment img:hover{opacity:.9}'
      + '.wf-gc-msg-attachment a{display:inline-flex;align-items:center;gap:4px;font-size:12px;text-decoration:none}'
      + '.wf-gc-msg-user .wf-gc-msg-attachment a{color:rgba(255,255,255,0.9)}'
      + '.wf-gc-msg-ai .wf-gc-msg-attachment a,.wf-gc-msg-agent .wf-gc-msg-attachment a{color:' + BRAND_COLOR + '}'
      + '.wf-gc-msg-attachment a:hover{text-decoration:underline}'
      + '.wf-gc-msg-attachment a svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}'
      // Mobile
      + '@media(max-width:440px){'
      + '  #wf-guest-chat-window{width:calc(100vw - 16px);' + POSITION + ':8px;bottom:80px;height:calc(100vh - 100px)}'
      + '  #wf-guest-chat-bubble{bottom:12px;' + POSITION + ':12px}'
      + '}';
    document.head.appendChild(style);
  }

  // ─── Build DOM ───────────────────────────────────────────────
  function buildWidget() {
    // Bubble
    var bubble = document.createElement('div');
    bubble.id = 'wf-guest-chat-bubble';
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.innerHTML = '<img src="https://we-fund.b-cdn.net/img/68c0b9e775be3fa0d4bd90cb3a3bdf07.png" alt="Support">';
    document.body.appendChild(bubble);

    // Window
    var win = document.createElement('div');
    win.id = 'wf-guest-chat-window';
    win.innerHTML = ''
      // Header
      + '<div class="wf-gc-header">'
      + '  <div><h3>Chat with Us</h3><p class="wf-gc-header-sub">We typically reply instantly</p></div>'
      + '  <button class="wf-gc-close" aria-label="Close chat">&times;</button>'
      + '</div>'
      // Pre-chat
      + '<div class="wf-gc-prechat" id="wf-gc-prechat">'
      + '  <h4>Welcome to WeFund!</h4>'
      + '  <p>Have a question? Chat with our AI assistant. Enter your details below to get started.</p>'
      + '  <input class="wf-gc-input" id="wf-gc-name" type="text" placeholder="Your name" maxlength="200">'
      + '  <input class="wf-gc-input" id="wf-gc-email" type="email" placeholder="Your email">'
      + '  <button class="wf-gc-btn" id="wf-gc-start">Start Chat</button>'
      + '</div>'
      // Chat
      + '<div class="wf-gc-chat" id="wf-gc-chat" style="display:none">'
      + '  <div class="wf-gc-error" id="wf-gc-error"></div>'
      + '  <div class="wf-gc-messages" id="wf-gc-messages">'
      + '    <div class="wf-gc-typing" id="wf-gc-typing"><span class="wf-gc-dot"></span><span class="wf-gc-dot"></span><span class="wf-gc-dot"></span></div>'
      + '  </div>'
      + '  <div id="wf-gc-attach-preview" style="display:none"></div>'
      + '  <div class="wf-gc-inputbar">'
      + '    <button class="wf-gc-attach-btn" id="wf-gc-attachbtn" style="display:none" aria-label="Attach file">'
      + '      <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>'
      + '    </button>'
      + '    <input type="file" id="wf-gc-fileinput" style="display:none" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf">'
      + '    <input type="text" id="wf-gc-msginput" placeholder="Type a message..." maxlength="10000">'
      + '    <button class="wf-gc-send" id="wf-gc-sendbtn" aria-label="Send">'
      + '      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
      + '    </button>'
      + '  </div>'
      + '  <div class="wf-gc-powered">Powered by <a href="https://we-fund.com" target="_blank" rel="noopener">WeFund</a></div>'
      + '</div>';
    document.body.appendChild(win);
  }

  // ─── Render Messages ────────────────────────────────────────
  function renderMessages() {
    var container = $('#wf-gc-messages');
    var typing = $('#wf-gc-typing');

    // Remove all message nodes but keep the typing indicator
    var children = container.children;
    for (var i = children.length - 1; i >= 0; i--) {
      if (children[i] !== typing) {
        container.removeChild(children[i]);
      }
    }

    state.messages.forEach(function (m) {
      var div = document.createElement('div');
      var cls = 'wf-gc-msg ';
      if (m.sender_type === 'user') cls += 'wf-gc-msg-user';
      else if (m.sender_type === 'agent') cls += 'wf-gc-msg-agent';
      else cls += 'wf-gc-msg-ai';
      div.className = cls;
      var displayContent = (m.sender_type !== 'user' && (m.metadata || {}).translated_content)
        ? m.metadata.translated_content
        : m.content;
      var attachmentHtml = '';
      if (m.attachment_url) {
        if (m.attachment_type && m.attachment_type.indexOf('image/') === 0) {
          attachmentHtml = '<div class="wf-gc-msg-attachment"><a href="' + escapeHtml(m.attachment_url) + '" target="_blank" rel="noopener noreferrer"><img src="' + escapeHtml(m.attachment_url) + '" alt="' + escapeHtml(m.attachment_name || 'Attachment') + '"></a></div>';
        } else if (m.attachment_type && m.attachment_type.indexOf('video/') === 0) {
          attachmentHtml = '<div class="wf-gc-msg-attachment"><video src="' + escapeHtml(m.attachment_url) + '" controls style="max-width:180px;border-radius:6px;"></video></div>';
        } else {
          attachmentHtml = '<div class="wf-gc-msg-attachment"><a href="' + escapeHtml(m.attachment_url) + '" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> ' + escapeHtml(m.attachment_name || 'Attachment') + '</a></div>';
        }
      }
      div.innerHTML = escapeHtml(displayContent) + attachmentHtml
        + (m.created_at ? '<div class="wf-gc-msg-time">' + formatTime(m.created_at) + '</div>' : '');
      container.insertBefore(div, typing);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function showError(msg) {
    var el = $('#wf-gc-error');
    el.textContent = msg;
    el.classList.add('wf-show');
    setTimeout(function () { el.classList.remove('wf-show'); }, 5000);
  }

  function setTyping(show) {
    var el = $('#wf-gc-typing');
    if (show) el.classList.add('wf-show');
    else el.classList.remove('wf-show');
  }

  // ─── Actions ─────────────────────────────────────────────────
  function toggleWindow() {
    state.open = !state.open;
    var win = $('#wf-guest-chat-window');
    if (state.open) {
      win.classList.add('wf-open');
      // If we have a session, go to chat view
      if (state.sessionToken) {
        showChatView();
      }
    } else {
      win.classList.remove('wf-open');
    }
  }

  function showChatView() {
    state.view = 'chat';
    $('#wf-gc-prechat').style.display = 'none';
    $('#wf-gc-chat').style.display = 'flex';
    renderMessages();
    startPolling();
    var input = $('#wf-gc-msginput');
    if (input) input.focus();
  }

  function showPrechatView() {
    state.view = 'prechat';
    $('#wf-gc-prechat').style.display = 'flex';
    $('#wf-gc-chat').style.display = 'none';
    stopPolling();
  }

  function startConversation() {
    var nameInput = $('#wf-gc-name');
    var emailInput = $('#wf-gc-email');
    var btn = $('#wf-gc-start');
    var name = (nameInput.value || '').trim();
    var email = (emailInput.value || '').trim();

    if (!name) { nameInput.focus(); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailInput.focus(); return; }

    btn.disabled = true;
    btn.textContent = 'Starting...';

    api('start-conversation', { guest_name: name, guest_email: email })
      .then(function (data) {
        state.sessionToken = data.session_token;
        state.conversationId = data.conversation_id;
        state.guestName = name;
        state.guestEmail = email;
        state.messages = data.messages || [];
        saveSession();
        showChatView();
      })
      .catch(function (err) {
        if (err.message === 'rate_limited') {
          alert('Too many requests. Please try again later.');
        } else {
          alert('Could not start chat. Please try again.');
        }
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Start Chat';
      });
  }

  function uploadGuestAttachment(file) {
    if (!state.sessionToken) return;

    var ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf'
    ];
    var MAX_SIZE = 25 * 1024 * 1024;

    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      showError('File type not allowed. Supported: images, videos, and PDFs.');
      return;
    }

    if (file.size > MAX_SIZE) {
      showError('File size exceeds 25MB limit.');
      return;
    }

    state.isUploading = true;
    updateAttachUI();

    var formData = new FormData();
    formData.append('session_token', state.sessionToken);
    formData.append('file', file);

    fetch(API_BASE + '/support/guest-chat/upload-attachment/', {
      method: 'POST',
      body: formData,
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || 'Upload failed'); });
      return r.json();
    })
    .then(function (result) {
      state.pendingAttachment = { url: result.url, name: result.name, type: result.type };
      updateAttachUI();
    })
    .catch(function (err) {
      showError(err.message || 'Failed to upload file');
    })
    .finally(function () {
      state.isUploading = false;
      updateAttachUI();
    });
  }

  function updateAttachUI() {
    var preview = $('#wf-gc-attach-preview');
    var attachBtn = $('#wf-gc-attachbtn');

    // Show/hide paperclip button
    if (attachBtn) {
      attachBtn.style.display = state.attachmentsEnabled ? 'flex' : 'none';
    }

    // Show/hide attachment preview
    if (preview) {
      if (state.pendingAttachment) {
        preview.style.display = 'flex';
        preview.className = 'wf-gc-attach-preview';
        preview.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>'
          + '<span class="wf-gc-attach-preview-name">' + escapeHtml(state.pendingAttachment.name) + '</span>'
          + '<button class="wf-gc-attach-preview-rm" id="wf-gc-attach-rm">&times;</button>';
        var rmBtn = $('#wf-gc-attach-rm');
        if (rmBtn) {
          rmBtn.addEventListener('click', function () {
            state.pendingAttachment = null;
            updateAttachUI();
          });
        }
      } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
      }
    }
  }

  function sendMessage() {
    var input = $('#wf-gc-msginput');
    var msg = (input.value || '').trim();
    var attachment = state.pendingAttachment;
    if ((!msg && !attachment) || state.sending || !state.sessionToken) return;

    state.sending = true;
    state.pendingAttachment = null;
    input.value = '';
    input.disabled = true;
    input.placeholder = 'AI is typing...';
    $('#wf-gc-sendbtn').disabled = true;
    updateAttachUI();

    var messageContent = msg || (attachment ? '[Attachment: ' + attachment.name + ']' : '');

    // Optimistically add user message
    var userMsg = {
      sender_type: 'user',
      content: messageContent,
      attachment_url: attachment ? attachment.url : null,
      attachment_name: attachment ? attachment.name : null,
      attachment_type: attachment ? attachment.type : null,
      created_at: new Date().toISOString()
    };
    state.messages.push(userMsg);
    renderMessages();
    setTyping(true);

    var payload = { session_token: state.sessionToken, message: messageContent };
    if (attachment) payload.attachment = attachment;

    api('send-message', payload)
      .then(function (data) {
        setTyping(false);
        // Add AI response if present
        if (data.ai_response && data.ai_response.content) {
          state.messages.push({
            sender_type: 'ai',
            content: data.ai_response.content,
            metadata: data.ai_response.metadata || {},
            created_at: data.ai_response.created_at,
          });
        }
        renderMessages();
      })
      .catch(function (err) {
        setTyping(false);
        if (err.message === 'rate_limited') {
          showError('You are sending messages too quickly. Please wait a moment.');
        } else {
          showError('Failed to send message. Please try again.');
        }
      })
      .finally(function () {
        state.sending = false;
        input.disabled = false;
        input.placeholder = 'Type a message...';
        $('#wf-gc-sendbtn').disabled = false;
        input.focus();
      });
  }

  // ─── Polling for agent replies ──────────────────────────────
  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(pollMessages, POLL_INTERVAL);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function pollMessages() {
    if (!state.sessionToken || state.sending) return;

    var lastTime = null;
    if (state.messages.length > 0) {
      lastTime = state.messages[state.messages.length - 1].created_at;
    }

    var body = { session_token: state.sessionToken };
    if (lastTime) body.after = lastTime;

    api('get-messages', body)
      .then(function (data) {
        // Track attachments_enabled changes
        if (data.attachments_enabled !== undefined) {
          var newVal = !!data.attachments_enabled;
          if (newVal !== state.attachmentsEnabled) {
            state.attachmentsEnabled = newVal;
            if (!newVal) state.pendingAttachment = null;
            updateAttachUI();
          }
        }

        if (!data.messages || data.messages.length === 0) return;

        // Only add messages we don't already have (by checking if newer than last)
        var existingIds = {};
        state.messages.forEach(function (m) { if (m.id) existingIds[m.id] = true; });

        var added = false;
        data.messages.forEach(function (m) {
          if (m.id && !existingIds[m.id]) {
            // Skip user messages we already optimistically added
            if (m.sender_type !== 'user') {
              state.messages.push(m);
              added = true;
            }
          }
        });

        if (added) renderMessages();

        // If conversation resolved, stop polling
        if (data.conversation_status === 'resolved') {
          stopPolling();
        }
      })
      .catch(function () {
        // Silent fail on poll
      });
  }

  // ─── Resume session ─────────────────────────────────────────
  function tryResumeSession() {
    if (!loadSession()) return;

    // Verify the session is still valid by fetching messages
    api('get-messages', { session_token: state.sessionToken })
      .then(function (data) {
        if (data.messages) {
          state.messages = data.messages;
          // Pre-fill form fields in case user opens chat
          var nameInput = $('#wf-gc-name');
          var emailInput = $('#wf-gc-email');
          if (nameInput) nameInput.value = state.guestName;
          if (emailInput) emailInput.value = state.guestEmail;
        }
        if (data.attachments_enabled !== undefined) {
          state.attachmentsEnabled = !!data.attachments_enabled;
          updateAttachUI();
        }
        if (data.conversation_status === 'resolved') {
          clearSession();
        }
      })
      .catch(function () {
        clearSession();
      });
  }

  // ─── Init ────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();

    // Event listeners
    $('#wf-guest-chat-bubble').addEventListener('click', toggleWindow);
    $('.wf-gc-close').addEventListener('click', toggleWindow);
    $('#wf-gc-start').addEventListener('click', startConversation);
    $('#wf-gc-sendbtn').addEventListener('click', sendMessage);

    $('#wf-gc-msginput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Attachment button and file input
    $('#wf-gc-attachbtn').addEventListener('click', function () {
      $('#wf-gc-fileinput').click();
    });

    $('#wf-gc-fileinput').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) {
        uploadGuestAttachment(file);
        this.value = '';
      }
    });

    // Enter key on email field starts conversation
    $('#wf-gc-email').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        startConversation();
      }
    });

    // Try to resume existing session
    tryResumeSession();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
