const http = require("http");
const app = require("./index");
const Student = require("./model");
const logger = require("./logger");
const WebSocket = require("ws");
const {
  studentIsNotInRegularStudentGroup,
  removeStudentWhoIsNotInRegularStudentGroup,
  sendCurrentState,
  moreThanOneStudentInData,
  studentNotFound,
  getNumberFromNumberString,
} = require("./helpers");

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
    setInterval(ping, 15000);
    ctx.on("message", async (message) => {
      try {
        // handle connection keepalive messages
        if (message === "__ping__") {
          pong();
          return;
        }

        const newMessage = JSON.parse(message).split("_");
        const state = newMessage[0];
        let number = newMessage[1];

        // If whatever data is present in the message is not a
        // student name or number, return early.
        if (studentNotFound(number)) return;

        // If a student does NOT have a curbside number and we are
        // trying to remove them, their case is handled a little differently
        // due to being stored in a different database, so we handle it
        // and then return early.
        if (studentIsNotInRegularStudentGroup(number)) {
          if (state !== "add") {
            await removeStudentWhoIsNotInRegularStudentGroup(number);
          }
          sendCurrentState(wss, {
            state,
            newStudent: number,
          });
          return;
        }

        // strip off any potential leading plus signs
        number = getNumberFromNumberString(number);

        // if there is more than one student number in the number
        // string, split it and get students for all numbers present
        // otherwise, just get the one student's number
        let newStudent = "";
        if (moreThanOneStudentInData(number)) {
          const numbers = number.split("+");
          newStudent = await Student.getMultipleStudentsByNumber(numbers);
        } else {
          newStudent = await Student.getStudentByNumber(number);
        }
        logger.info(newStudent);

        // In this case, "student not found" could be a number
        // that doesn't exist, or a number that has already been used
        // and can't be used again today. Finally, take the state (add or remove)
        // and the new student string, and send them to each client in the websocket.
        if (!studentNotFound(newStudent)) {
          sendCurrentState(wss, {
            state,
            newStudent,
          });
        }
      } catch (error) {
        logger.error(error);
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
