import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";

const corsPolicies = {
  origin: "*",
  allowedHeaders: "*",
};

const app = express();
app.use(cors(corsPolicies));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsPolicies,
});

const PORT = process.env.PORT || 5000;

const users = {};
const Rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, name }) => {
    if (users[roomId]) {
      users[roomId].push({ id: socket.id, name });
    } else {
      users[roomId] = [{ id: socket.id, name }];
    }

    Rooms[socket.id] = roomId;
    const usersInThisRoom = users[roomId].filter(
      (user) => user.id !== socket.id
    );

    socket.emit("all-users", usersInThisRoom);
  });

  socket.on("signalling", ({ userToConnect, callerId, signal, myName }) => {
    io.to(userToConnect).emit("user-joined", {
      signal: signal,
      callerId: callerId,
      name: myName,
    });
  });

  socket.on("signalling-back", ({ signal, callerId }) => {
    io.to(callerId).emit("handshake", {
      signal: signal,
      id: socket.id,
    });
  });

  socket.on("manual-disconnect", ({ id }) => {
    const roomId = Rooms[id];
    let allUsers = users[roomId];
    if (allUsers) {
      allUsers = allUsers.filter((user) => user.id !== id);
      users[roomId] = allUsers;
    }
    socket.broadcast.emit("user-left", { quiterId: id });
  });

  socket.on("disconnect", () => {
    const roomId = Rooms[socket.id];
    let allUsers = users[roomId];
    if (allUsers) {
      allUsers = allUsers.filter((user) => user.id !== socket.id);
      users[roomId] = allUsers;
    }
    socket.broadcast.emit("user-left", { quiterId: socket.id });
  });
});

httpServer.listen(PORT, () => console.log("server started on port ", PORT));
