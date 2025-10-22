import { io, Socket } from "socket.io-client";
import { ArbitrageOpportunity, DashboardStats } from "@/types";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();

    return this.socket;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.reconnectAttempts++;
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Listen for opportunities updates
  onOpportunities(callback: (opportunities: ArbitrageOpportunity[]) => void): void {
    this.socket?.on("opportunities", callback);
  }

  // Listen for new opportunity
  onNewOpportunity(callback: (opportunity: ArbitrageOpportunity) => void): void {
    this.socket?.on("newOpportunity", callback);
  }

  // Listen for opportunity expiration
  onOpportunityExpired(callback: (id: string) => void): void {
    this.socket?.on("opportunityExpired", callback);
  }

  // Listen for stats updates
  onStats(callback: (stats: DashboardStats) => void): void {
    this.socket?.on("stats", callback);
  }

  // Remove listener
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();

// Export class for testing
export default SocketClient;
