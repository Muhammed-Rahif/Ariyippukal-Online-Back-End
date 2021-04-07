const mongoClient = require("mongodb").MongoClient;
const state = {
  db: null,
};

module.exports.connect = (done) => {
    const dbname = "AriyippukalOnline";
  const url = "mongodb+srv://muhammed-rahif:hkYx1f5WywU2GPrA@ariyippukalonline.yrugo.mongodb.net/"+dbname+"?retryWrites=true&w=majority" || "mongodb://localhost:27017";

  mongoClient.connect(url,{ useNewUrlParser: true, useUnifiedTopology: true }, (err, data) => {
    if (err) {
      return done(err);
    } else {
      state.db = data.db(dbname);
      done();
    }
  });
};
module.exports.get = () => {
  return state.db;
};
