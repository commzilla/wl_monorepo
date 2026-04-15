
(function() {
  'use strict';
  
  console.log('WeFund Chat Widget: Script loaded');
  
  // Configuration
  const WIDGET_CONFIG = {
    apiUrl: window.location.origin,
    containerId: 'wefund-chat-widget',
    widgetId: null // Will be set during initialization
  };

  // Chat Widget Class
  class WeFundChatWidget {
    constructor(config) {
      this.config = { ...WIDGET_CONFIG, ...config };
      this.isOpen = false;
      this.isMinimized = false;
      this.messages = [];
      this.session = null;
      this.visitorInfo = { name: '', email: '' };
      this.hasProvidedInfo = false;
      this.widgetConfig = null;
      this.visitorId = this.generateVisitorId();
      
      console.log('WeFund Chat Widget: Initializing with config:', this.config);
      this.init();
    }

    generateVisitorId() {
      return Math.random().toString(36).substr(2, 9);
    }

    async init() {
      try {
        console.log('WeFund Chat Widget: Loading widget configuration...');
        await this.loadWidgetConfig();
        if (this.widgetConfig && this.widgetConfig.is_enabled) {
          console.log('WeFund Chat Widget: Widget enabled, creating widget');
          this.createWidget();
        } else {
          console.log('WeFund Chat Widget: Widget is disabled or config not found');
        }
      } catch (error) {
        console.error('WeFund Chat Widget: Failed to initialize:', error);
      }
    }

    async loadWidgetConfig() {
      try {
        const url = `${this.config.apiUrl}/functions/v1/chat-widget-api/widget-config`;
        console.log('WeFund Chat Widget: Fetching config from:', url);
        
        const response = await fetch(url);
        console.log('WeFund Chat Widget: Config response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to load widget config: ${response.status} ${response.statusText}`);
        }
        
        this.widgetConfig = await response.json();
        console.log('WeFund Chat Widget: Config loaded:', this.widgetConfig);
      } catch (error) {
        console.error('WeFund Chat Widget: Error loading widget config:', error);
        throw error;
      }
    }

    createWidget() {
      console.log('WeFund Chat Widget: Creating widget container');
      
      // Create container
      const container = document.createElement('div');
      container.id = this.config.containerId;
      container.style.cssText = `
        position: fixed;
        ${this.widgetConfig.position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : 'bottom: 20px; right: 20px;'}
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      document.body.appendChild(container);
      this.container = container;
      this.renderWidget();
    }

    renderWidget() {
      if (!this.isOpen) {
        this.container.innerHTML = `
          <button id="chat-toggle-btn" style="
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: none;
            background-color: ${this.widgetConfig.primary_color};
            color: ${this.widgetConfig.text_color};
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </button>
        `;
        
        document.getElementById('chat-toggle-btn').addEventListener('click', () => {
          console.log('WeFund Chat Widget: Toggle button clicked');
          this.isOpen = true;
          this.renderWidget();
        });
      } else {
        this.renderChatWindow();
      }
    }

    renderChatWindow() {
      this.container.innerHTML = `
        <div id="chat-window" style="
          width: 320px;
          height: ${this.isMinimized ? '48px' : '400px'};
          background: ${this.widgetConfig.background_color};
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        ">
          <div id="chat-header" style="
            background: ${this.widgetConfig.primary_color};
            color: ${this.widgetConfig.text_color};
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${this.widgetConfig.logo_url ? `<img src="${this.widgetConfig.logo_url}" alt="Logo" style="width: 24px; height: 24px; border-radius: 4px;">` : ''}
              <span style="font-weight: 600;">${this.widgetConfig.name}</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button id="minimize-btn" style="background: none; border: none; color: ${this.widgetConfig.text_color}; cursor: pointer; padding: 4px;">−</button>
              <button id="close-btn" style="background: none; border: none; color: ${this.widgetConfig.text_color}; cursor: pointer; padding: 4px;">×</button>
            </div>
          </div>
          ${!this.isMinimized ? this.renderChatContent() : ''}
        </div>
      `;

      this.attachEventListeners();
    }

    renderChatContent() {
      if (!this.hasProvidedInfo) {
        return `
          <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 12px;">
            <p style="margin: 0; color: #666; font-size: 14px;">${this.widgetConfig.welcome_message}</p>
            <input id="visitor-name" type="text" placeholder="Your name" style="
              padding: 8px 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            " />
            <input id="visitor-email" type="email" placeholder="Your email" style="
              padding: 8px 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            " />
            <button id="start-chat-btn" style="
              background: ${this.widgetConfig.primary_color};
              color: ${this.widgetConfig.text_color};
              border: none;
              padding: 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">Start Chat</button>
          </div>
        `;
      }

      return `
        <div id="messages-container" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        ">
          ${this.messages.map(msg => `
            <div style="
              display: flex;
              ${msg.sender_type === 'visitor' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
            ">
              <div style="
                max-width: 240px;
                padding: 8px 12px;
                border-radius: 12px;
                font-size: 14px;
                ${msg.sender_type === 'visitor' 
                  ? `background: ${this.widgetConfig.primary_color}; color: ${this.widgetConfig.text_color};`
                  : 'background: #f1f1f1; color: #333;'
                }
              ">
                ${msg.message}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="
          padding: 16px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 8px;
        ">
          <input id="message-input" type="text" placeholder="Type your message..." style="
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 20px;
            font-size: 14px;
          " />
          <button id="send-btn" style="
            background: ${this.widgetConfig.primary_color};
            color: ${this.widgetConfig.text_color};
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">→</button>
        </div>
      `;
    }

    attachEventListeners() {
      const closeBtn = document.getElementById('close-btn');
      const minimizeBtn = document.getElementById('minimize-btn');
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.isOpen = false;
          this.renderWidget();
        });
      }

      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
          this.isMinimized = !this.isMinimized;
          this.renderWidget();
        });
      }

      if (!this.hasProvidedInfo) {
        const startBtn = document.getElementById('start-chat-btn');
        const nameInput = document.getElementById('visitor-name');
        const emailInput = document.getElementById('visitor-email');

        if (startBtn) {
          startBtn.addEventListener('click', () => this.startChat());
        }

        [nameInput, emailInput].forEach(input => {
          if (input) {
            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') this.startChat();
            });
          }
        });
      } else {
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');

        if (sendBtn) {
          sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (messageInput) {
          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
          });
        }
      }
    }

    async startChat() {
      const nameInput = document.getElementById('visitor-name');
      const emailInput = document.getElementById('visitor-email');
      
      const name = nameInput?.value.trim();
      const email = emailInput?.value.trim();

      if (!name || !email) {
        alert('Please provide your name and email to start chatting');
        return;
      }

      this.visitorInfo = { name, email };

      try {
        console.log('WeFund Chat Widget: Starting chat session...');
        const url = `${this.config.apiUrl}/functions/v1/chat-widget-api/sessions`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: this.visitorId,
            visitor_name: name,
            visitor_email: email
          })
        });

        console.log('WeFund Chat Widget: Session response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to start chat: ${response.status} ${errorText}`);
        }
        
        this.session = await response.json();
        console.log('WeFund Chat Widget: Session created:', this.session);
        this.hasProvidedInfo = true;
        
        // Add welcome message
        this.messages.push({
          id: 'welcome',
          message: this.widgetConfig.welcome_message,
          sender_type: 'agent',
          created_at: new Date().toISOString()
        });

        this.renderWidget();
        this.startMessagePolling();
      } catch (error) {
        console.error('WeFund Chat Widget: Error starting chat:', error);
        alert('Failed to start chat. Please try again.');
      }
    }

    async sendMessage() {
      const messageInput = document.getElementById('message-input');
      const message = messageInput?.value.trim();
      
      if (!message || !this.session) return;

      messageInput.value = '';

      try {
        console.log('WeFund Chat Widget: Sending message...');
        const url = `${this.config.apiUrl}/functions/v1/chat-widget-api/messages`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.session.id,
            message,
            sender_type: 'visitor'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to send message: ${response.status} ${errorText}`);
        }
        
        const newMessage = await response.json();
        this.messages.push(newMessage);
        this.renderWidget();
        this.scrollToBottom();
      } catch (error) {
        console.error('WeFund Chat Widget: Error sending message:', error);
      }
    }

    startMessagePolling() {
      if (this.pollingInterval) return;
      
      console.log('WeFund Chat Widget: Starting message polling...');
      this.pollingInterval = setInterval(async () => {
        if (!this.session) return;
        
        try {
          const url = `${this.config.apiUrl}/functions/v1/chat-widget-api/messages/${this.session.id}`;
          const response = await fetch(url);
          if (!response.ok) return;
          
          const messages = await response.json();
          if (messages.length > this.messages.length) {
            this.messages = messages;
            this.renderWidget();
            this.scrollToBottom();
          }
        } catch (error) {
          console.error('WeFund Chat Widget: Error polling messages:', error);
        }
      }, 2000);
    }

    scrollToBottom() {
      setTimeout(() => {
        const container = document.getElementById('messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }

  // Auto-initialize when script loads
  function initializeWidget() {
    console.log('WeFund Chat Widget: DOM ready, initializing widget...');
    if (window.WeFundChat && window.WeFundChat.config) {
      console.log('WeFund Chat Widget: Using provided config:', window.WeFundChat.config);
      new WeFundChatWidget(window.WeFundChat.config);
    } else {
      console.log('WeFund Chat Widget: Using default config');
      new WeFundChatWidget({});
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

  // Expose widget class globally
  window.WeFundChatWidget = WeFundChatWidget;
})();
