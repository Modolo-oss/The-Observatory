import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    clients.add(ws);

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });

    // Send initial connection success
    ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
  });

  // Broadcast function to send updates to all clients
  const broadcast = (type: string, data: any) => {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Note: Metrics broadcasting is handled by the benchmark execution flow
  // Dashboard gets initial data from REST API and real-time updates during benchmark runs
  
  return { wss, broadcast };
}
