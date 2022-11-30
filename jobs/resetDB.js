const db = require("../db");
require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const reset = async () => {
  await db.query(
    `UPDATE students
     SET isloaded = $1,
     time = $2,
     added = $3`,
    [false, null, false]
  );

  await db.query(`DELETE FROM temp_students`);
};

reset()
  .then(async () => {
    const query = await db.query(`SELECT isloaded FROM students`);
    return query.rows.filter((q) => q.isloaded);
  })
  .then((arr) => {
    if (arr.length) {
      const id = client.messages.create({
        body: "Heroku Curbside App DB did not reset properly; see Heroku for details.",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.RECEIVER_PHONE_NUMBER,
      });
      return id;
    }
  })
  .then((message) => {
    if (message) {
      console.log(message.sid);
    } else {
      console.log("All done!");
    }
    process.exit();
  });
