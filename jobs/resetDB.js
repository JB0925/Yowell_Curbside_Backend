const db = require("../db");

await db.query(
  `UPDATE students
   SET isloaded = $1,
   time = $2,
   added = $3`,
  [false, null, false]
);
