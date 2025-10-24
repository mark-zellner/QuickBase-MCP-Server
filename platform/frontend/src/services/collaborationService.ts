import { CollaborationMessage, WebSocketMessage } from '../types/shared.js';

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

export interface CollaborationState {
  users: CollaborationUser[];
  isConnected: boolean;
  projectId: string | null;
}

type CollaborationEventHandler = (message: CollaborationMessage) => void;

class CollaborationService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, CollaborationEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Initialize event handler maps
    this.eventHandlers.set('cursor_position', []);
    this.eventHandlers.set('text_change', []);
    this.eventHandlers.set('user_joined', []);
    this.eventHandlers.set('user_left', []);
  }

  public connect(projectId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.currentProjectId = projectId;
        this.currentUserId = userId;

        // Use secure WebSocket in production, regular WebSocket in development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/collaboration`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected for collaboration');
          this.reconnectAttempts = 0;
          
          // Join the project room
          this.sendMessage({
            type: 'user_joined',
            userId,
            projectId,
            data: { timestamp: new Date() },
            timestamp: new Date(),
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            if (message.type === 'collaboration') {
              this.handleCollaborationMessage(message.payload as CollaborationMessage);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.ws && this.currentProjectId && this.currentUserId) {
      // Send user left message before closing
      this.sendMessage({
        type: 'user_left',
        userId: this.currentUserId,
        projectId: this.currentProjectId,
        data: { timestamp: new Date() },
        timestamp: new Date(),
      });
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentProjectId = null;
    this.currentUserId = null;
  }

  public sendCursorPosition(line: number, column: number): void {
    if (!this.currentProjectId || !this.currentUserId) return;

    this.sendMessage({
      type: 'cursor_position',
      userId: this.currentUserId,
      projectId: this.currentProjectId,
      data: { line, column },
      timestamp: new Date(),
    });
  }

  public sendTextChange(change: {
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    text: string;
  }): void {
    if (!this.currentProjectId || !this.currentUserId) return;

    this.sendMessage({
      type: 'text_change',
      userId: this.currentUserId,
      projectId: this.currentProjectId,
      data: change,
      timestamp: new Date(),
    });
  }

  public onCursorPosition(handler: (userId: string, line: number, column: number) => void): () => void {
    const wrappedHandler: CollaborationEventHandler = (message) => {
      if (message.userId !== this.currentUserId) {
        handler(message.userId, message.data.line, message.data.column);
      }
    };

    this.addEventListener('cursor_position', wrappedHandler);
    
    return () => this.removeEventListener('cursor_position', wrappedHandler);
  }

  public onTextChange(handler: (userId: string, change: any) => void): () => void {
    const wrappedHandler: CollaborationEventHandler = (message) => {
      if (message.userId !== this.currentUserId) {
        handler(message.userId, message.data);
      }
    };

    this.addEventListener('text_change', wrappedHandler);
    
    return () => this.removeEventListener('text_change', wrappedHandler);
  }

  public onUserJoined(handler: (userId: string) => void): () => void {
    const wrappedHandler: CollaborationEventHandler = (message) => {
      if (message.userId !== this.currentUserId) {
        handler(message.userId);
      }
    };

    this.addEventListener('user_joined', wrappedHandler);
    
    return () => this.removeEventListener('user_joined', wrappedHandler);
  }

  public onUserLeft(handler: (userId: string) => void): () => void {
    const wrappedHandler: CollaborationEventHandler = (message) => {
      if (message.userId !== this.currentUserId) {
        handler(message.userId);
      }
    };

    this.addEventListener('user_left', wrappedHandler);
    
    return () => this.removeEventListener('user_left', wrappedHandler);
  }

  private sendMessage(message: CollaborationMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const wsMessage: WebSocketMessage = {
        type: 'collaboration',
        payload: message,
        timestamp: new Date(),
        userId: this.currentUserId || undefined,
        projectId: this.currentProjectId || undefined,
      };

      this.ws.send(JSON.stringify(wsMessage));
    }
  }

  private handleCollaborationMessage(message: CollaborationMessage): void {
    const handlers = this.eventHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  private addEventListener(type: string, handler: CollaborationEventHandler): void {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.push(handler);
    this.eventHandlers.set(type, handlers);
  }

  private removeEventListener(type: string, handler: CollaborationEventHandler): void {
    const handlers = this.eventHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(type, handlers);
    }
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentProjectId && this.currentUserId) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(this.currentProjectId!, this.currentUserId!).catch(console.error);
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();