const http = require("http");
const app = require("./index");
const Student = require("./model");

const WebSocket = require("ws");

function setupWebSocket(server) {
  // ws instance
  const wss = new WebSocket.Server({ noServer: true });

  // handle upgrade of the request
  server.on("upgrade", function upgrade(request, socket, head) {
    try {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit("connection", ws, request);
      });
    } catch (err) {
      console.log("upgrade exception", err);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
  });

  // what to do after a connection is established
  wss.on("connection", (ctx) => {
    // handle message events
    ctx.on("message", async (message) => {
      try {
        const number = JSON.parse(message);
        const newStudent = await Student.getStudent(number);
        wss.clients.forEach((c) => c.send(newStudent));
      } catch (error) {
        console.log(error);
      }
    });

    // handle close event
    ctx.on("close", () => {
      console.log("closed", wss.clients.size);
    });

    // sent a message that we're good to proceed
    // ctx.send("connection established.");
  });
}

const server = http.createServer(app);

// pass the same server to our websocket setup function
// the websocket server will the run on the same port
// accepting ws:// connections
server.listen(3001);
setupWebSocket(server);
