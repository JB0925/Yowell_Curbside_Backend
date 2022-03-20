const http = require("http");
const app = require("./index");
const Student = require("./model");

const WebSocket = require("ws");

function setupWebSocket(server) {
  // ws instance
  const wss = new WebSocket.Server({ noServer: true });
  let tm;

  const ping = () => {
    wss.clients.forEach((c) => c.send("__ping__"));
    tm = setTimeout(() => {}, 5000);
  };

  const pong = () => {
    clearTimeout(tm);
  };

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
    setInterval(ping, 30000);
    ctx.on("message", async (message) => {
      try {
        if (message === "__ping__") {
          pong();
          return;
        } else {
          const status = JSON.parse(message).split("_");
          const state = status[0];
          let number = status[1];
          console.log(`The number is: ${number}`);
          console.log(state, number);
          if (number === "Student not found" || number === undefined) return;

          const pattern = /\d+/g;
          if (
            !number.match(pattern) ||
            parseInt(number.match(pattern)[0]) >= 500
          ) {
            console.log("heckyea");
            if (state !== "add") {
              const name = number.split(": ").pop();
              await Student.removeStudentWithNoNumber(name);
            }

            wss.clients.forEach((c) => {
              c.send(JSON.stringify({ state, newStudent: number }));
            });
            return;
          }
          number = number.match(pattern).join("+");

          let newStudent = "";
          if (number.split("+").length > 1) {
            const numbers = number.split("+");
            console.log(`Your numbers are: ${numbers}`);
            newStudent = await Student.getMultipleStudentsByNumber(numbers);
          } else {
            newStudent = await Student.getStudentByNumber(number);
          }
          console.log(`newStudents: ${newStudent}`);
          if (newStudent !== "Student not found" && newStudent !== undefined) {
            wss.clients.forEach((c) =>
              c.send(JSON.stringify({ state, newStudent }))
            );
          }
        }
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
const PORT = +process.env.PORT || 3001;
server.listen(PORT);
setupWebSocket(server);
