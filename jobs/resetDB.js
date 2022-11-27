const db = require("../db");

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

reset().then(() => {
  console.log("All done!");
  process.exit();
});
