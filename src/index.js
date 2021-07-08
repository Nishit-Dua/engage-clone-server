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

const PORT = 5000;

const users = {};
const Rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", (roomID) => {
    if (users[roomID]) {
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    Rooms[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("all-users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToConnect).emit("user-joined", {
      signal: payload.signal,
      callerId: payload.callerId,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerId).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const roomID = Rooms[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
    socket.broadcast.emit("user-left", { quiterId: socket.id });
  });
});

httpServer.listen(PORT, () => console.log("server started on port ", PORT));
