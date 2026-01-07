import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface WSMessage {
  type: "new_message" | "conversation_update" | "message_status";
  data: any;
}

class WhatsAppWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: "/ws/whatsapp"
    });

    this.wss.on("connection", (ws) => {
      console.log("WhatsApp WebSocket client connected");
      this.clients.add(ws);

      ws.on("close", () => {
        console.log("WhatsApp WebSocket client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
    });

    console.log("WhatsApp WebSocket server initialized on /ws/whatsapp");
  }

  broadcast(message: WSMessage) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  notifyNewMessage(conversationId: number, message: any) {
    this.broadcast({
      type: "new_message",
      data: { conversationId, message }
    });
  }

  notifyConversationUpdate(conversation: any) {
    this.broadcast({
      type: "conversation_update",
      data: conversation
    });
  }

  notifyMessageStatus(messageId: number, status: string) {
    this.broadcast({
      type: "message_status",
      data: { messageId, status }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const whatsappWS = new WhatsAppWebSocketServer();
