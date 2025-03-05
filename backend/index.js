const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  },
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("offer", (data) => {
    console.log("Received Offer");
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", (data) => {
    console.log("Received Answer");
    socket.broadcast.emit("answer", data);
  });

  socket.on("candidate", (data) => {
    console.log("Received");
    socket.broadcast.emit("candidate", data);
  });

  socket.on("disconnect", () => {
    console.log("disconnected", socket.id);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
