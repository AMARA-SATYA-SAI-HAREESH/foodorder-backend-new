const socketIO = require("socket.io");

let io;
let activeConnections; // Moved outside
let driverLocations; // Moved outside

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Initialize maps
  activeConnections = new Map(); // userId -> socketId
  driverLocations = new Map(); // driverId -> location

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // User authentication
    socket.on("authenticate", (userId) => {
      activeConnections.set(userId, socket.id);
      console.log(`User ${userId} authenticated with socket ${socket.id}`);

      // Join user-specific room
      socket.join(`user_${userId}`);
    });

    // Driver authentication and location updates
    socket.on("driver-authenticate", (driverId) => {
      activeConnections.set(`driver_${driverId}`, socket.id);
      socket.join(`driver_${driverId}`);
      console.log(`Driver ${driverId} connected`);
    });

    socket.on("driver-location-update", (data) => {
      const { driverId, location } = data;
      driverLocations.set(driverId, {
        ...location,
        lastUpdated: new Date(),
        socketId: socket.id,
      });

      // Broadcast to relevant clients (customers tracking their order)
      socket.to(`driver_${driverId}_trackers`).emit("driver-location-changed", {
        driverId,
        location,
        timestamp: new Date(),
      });
    });

    // Order tracking
    socket.on("track-order", (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} tracking order ${orderId}`);
    });

    // Vendor connections
    socket.on("vendor-authenticate", (vendorId) => {
      activeConnections.set(`vendor_${vendorId}`, socket.id);
      socket.join(`vendor_${vendorId}`);
      console.log(`Vendor ${vendorId} connected`);
    });

    // Real-time order status updates
    socket.on("order-status-update", (data) => {
      const { orderId, status, userId, driverId } = data;

      // Notify customer
      if (userId) {
        io.to(`user_${userId}`).emit("order-status-changed", {
          orderId,
          status,
          timestamp: new Date(),
        });
      }

      // Notify driver
      if (driverId) {
        io.to(`driver_${driverId}`).emit("order-updated", {
          orderId,
          status,
          timestamp: new Date(),
        });
      }

      // Notify everyone tracking this order
      io.to(`order_${orderId}`).emit("order-update", {
        orderId,
        status,
        timestamp: new Date(),
      });

      console.log(`Order ${orderId} status updated to ${status}`);
    });

    // Driver assignment notifications
    socket.on("assign-driver", (data) => {
      const { orderId, driverId } = data;

      // Notify driver
      io.to(`driver_${driverId}`).emit("new-assignment", {
        orderId,
        message: "You have a new delivery assignment",
        timestamp: new Date(),
      });
    });

    // Chat messages
    socket.on("send-message", (data) => {
      const { orderId, senderId, senderType, message } = data;
      const chatMessage = {
        orderId,
        senderId,
        senderType, // 'customer', 'driver', 'vendor'
        message,
        timestamp: new Date(),
      };

      // Broadcast to everyone in the order chat room
      io.to(`order_chat_${orderId}`).emit("new-message", chatMessage);
    });

    // Join order chat
    socket.on("join-order-chat", (orderId) => {
      socket.join(`order_chat_${orderId}`);
    });

    // Disconnection
    socket.on("disconnect", () => {
      // Remove from active connections
      for (const [key, value] of activeConnections.entries()) {
        if (value === socket.id) {
          activeConnections.delete(key);

          // Remove driver location if it was a driver
          if (key.startsWith("driver_")) {
            const driverId = key.replace("driver_", "");
            driverLocations.delete(driverId);
          }

          console.log(`User ${key} disconnected`);
          break;
        }
      }

      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

// Helper functions to emit events from controllers
const emitToUser = (userId, event, data) => {
  if (!io || !activeConnections) return false;
  const socketId = activeConnections.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const emitToDriver = (driverId, event, data) => {
  if (!io || !activeConnections) {
    console.error("Socket.IO or activeConnections not initialized");
    return false;
  }

  const socketId = activeConnections.get(`driver_${driverId}`);
  if (socketId) {
    io.to(socketId).emit(event, data);
    console.log(`✅ Notification sent to driver ${driverId}`);
    return true;
  }
  console.log(`⚠️ Driver ${driverId} not connected`);
  return false;
};

const emitToVendor = (vendorId, event, data) => {
  if (!io || !activeConnections) return false;
  const socketId = activeConnections.get(`vendor_${vendorId}`);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const emitToOrder = (orderId, event, data) => {
  if (!io) return false;
  io.to(`order_${orderId}`).emit(event, data);
  return true;
};

const getDriverLocation = (driverId) => {
  if (!driverLocations) return null;
  return driverLocations.get(driverId);
};

module.exports = {
  initSocket,
  emitToUser,
  emitToDriver,
  emitToVendor,
  emitToOrder,
  getDriverLocation,
};
