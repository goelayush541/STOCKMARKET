class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.subscriptions = new Map();
    this.messageHandlers = new Set();
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Resubscribe to all previous subscriptions
      this.subscriptions.forEach((params, channel) => {
        this.subscribe(channel, params);
      });
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, this.reconnectInterval * this.reconnectAttempts);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  subscribe(channel, params = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.subscriptions.set(channel, params);
      return;
    }
    
    const message = {
      type: 'subscribe',
      channel,
      ...params
    };
    
    this.socket.send(JSON.stringify(message));
    this.subscriptions.set(channel, params);
  }

  unsubscribe(channel) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.subscriptions.delete(channel);
      return;
    }
    
    const message = {
      type: 'unsubscribe',
      channel
    };
    
    this.socket.send(JSON.stringify(message));
    this.subscriptions.delete(channel);
  }

  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

export const webSocketService = new WebSocketService();