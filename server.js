const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");
const path = require("path");
// const fileName = "./views/database/data.json";
// const db = require(fileName);
const handlebars = require("express-handlebars").create({
  extname: "hbs",
});
const corsOptions = {
  origin: "http://localhost:5500",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  methods: "GET",
  credentials: true,
};
const functions = require("./functions/functions");
const session = require("express-session");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const fs = require("fs");
const db = require("./config/connection");

app.use(express.static(path.join(__dirname, "public")));
app.use(session({ secret: "unique key", cookie: { maxAge: 6000000 } }));
app.engine("hbs", handlebars.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(fileUpload());
db.connect((err) => {
  if (err) {
    console.log("Database connection Error :" + err);
  } else {
    console.log("Database successfully connected to port!");
  }
});

// req.body parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

const verifyAdminLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    req.session.adminData = {};
    res.redirect("/login");
  }
};

const generateThumbnail = (postId) => {
  sharp(`./public/images/main-images/${postId}.jpg`)
    .resize(200, 200)
    .toFile(
      `./public/images/thumb-images/${postId}.jpg`,
      (err, resizeImage) => {
        if (err) {
          console.log(err);
        } else {
          console.log(resizeImage);
        }
      }
    );
};

app.get("/", verifyAdminLogin, (req, res) => {
  var postUpadtedStatus = req.query.postUpadtedStatus;
  var postUpdatedMsg = req.query.postUpdatedMsg;
  if (postUpadtedStatus) {
    functions.getAllPosts().then((allPosts) => {
      res.render("view-posts", { allPosts, postUpadtedStatus, postUpdatedMsg });
    });
  } else {
    functions.getAllPosts().then((allPosts) => {
      res.render("view-posts", { allPosts });
    });
  }
});

app.get("/login", (req, res) => {
  if (typeof req.session.adminLoggedIn === "undefined") {
    req.session.adminLoggedIn = false;
    res.redirect("/");
  } else {
    if (req.session.adminLoggedIn) {
      res.redirect("/");
    } else {
      let loginErr = req.session.adminData.adminLoginErr
        ? req.session.adminData.adminLoginErr
        : false;
      let reqData = req.session.reqData ? req.session.reqData : false;
      res.render("login-page", { loginErr: loginErr, reqData: reqData });
      req.session.adminData.adminLoginErr = false;
      req.session.reqData = false;
    }
  }
});

app.post("/login", (req, res) => {
  functions.checkAdminLogin(req.body).then((response) => {
    if (response.adminLogin) {
      req.session.adminLoggedIn = true;
      req.session.adminData.adminDete = req.body;
      res.redirect("/");
    } else {
      req.session.adminData.adminLoginErr = response.loginErrKey;
      req.session.reqData = req.body;
      res.redirect("/login");
    }
  });
});

app.get("/post", verifyAdminLogin, (req, res) => {
  res.render("add-post");
});

app.post("/post", (req, res) => {
  req.body.postId = uuidv4();
  let reqData = req.body;
  let mainImage = req.files.mainImage;
  functions.createPost(reqData).then((response) => {
    mainImage.mv(
      "./public/images/main-images/" + reqData.postId + ".jpg",
      (err, done) => {
        if (err) {
          console.log(err);
          res.render("add-post", {
            responseMsg: "Post not created!",
            resStatus: "error",
          });
        } else {
          generateThumbnail(reqData.postId);
          res.render("add-post", {
            responseMsg: "Post added successfully!",
            resStatus: "success",
          });
        }
      }
    );
  });
});

app.post("/delete-post/:postId", (req, res) => {
  let postId = req.params.postId;
  functions.deletePost(postId).then((response) => {
    functions.dltImage(postId, "thumb");
    functions.dltImage(postId, "main");
    res.json({ deleteStatus: true });
  });
});

app.get("/edit-post/:postId", verifyAdminLogin, (req, res) => {
  let postId = req.params.postId;
  functions.getPostDetails(postId).then((postData) => {
    res.render("edit-post", { postData });
  });
});

app.post("/edit-post/:postId", (req, res) => {
  let reqData = req.body;
  console.log(reqData);
  let postId = req.params.postId;
  let imgSelected = reqData.imgSelected;
  delete reqData.imgSelected;
  functions.updatePost(postId, reqData).then(() => {
    if (imgSelected === "true") {
      let mainImage = req.files.mainImage;
      mainImage.mv(
        "./public/images/main-images/" + postId + ".jpg",
        async (err, done) => {
          if (err) {
            console.log(err);
            let postUpadtedStatus = encodeURIComponent("error");
            let postUpdatedMsg = encodeURIComponent("Post not updated!");
            res.redirect(
              "/?postUpadtedStatus=" +
                postUpadtedStatus +
                "&postUpdatedMsg=" +
                postUpdatedMsg
            );
          } else {
            console.log(err);
            let postUpadtedStatus = encodeURIComponent("success");
            let postUpdatedMsg = encodeURIComponent(
              "Post updated successfully!"
            );
            generateThumbnail(postId);
            res.redirect(
              "/?postUpadtedStatus=" +
                postUpadtedStatus +
                "&postUpdatedMsg=" +
                postUpdatedMsg
            );
          }
        }
      );
    } else {
      // send post updates status to admin
      res.redirect("/");
    }
  });
});

app.get("/most-read-posts", verifyAdminLogin, (req, res) => {
  functions.getAllPosts().then((allPosts) => {
    res.render("most-read-posts", { allPosts });
  });
});

app.post("/add-most-read-posts", (req, res) => {
  var reqData = req.body;
  var selectedPosts = reqData.selected;
  functions.clearMostReadPostsList().then(() => {
    selectedPosts.forEach((postId) => {
      console.log(postId);
      functions.addToMostReadPosts(postId);
    });
  });
  res.json({ status: true });
});

app.post("/get-all-most-read-posts", (req, res) => {
  functions.getAllMostReadPostsIds().then((allMostReadPostsIds) => {
    res.json(allMostReadPostsIds);
  });
});

app.get("/featured-posts", verifyAdminLogin, (req, res) => {
  functions.getAllPosts().then((allPosts) => {
    res.render("featured-posts", { allPosts });
  });
});

app.post("/add-featured-posts", (req, res) => {
  var reqData = req.body;
  var selectedPosts = reqData.selected;
  functions.clearFeaturedPostsList().then(() => {
    selectedPosts.forEach((postId) => {
      console.log(postId);
      functions.addToFeaturedPosts(postId);
    });
  });
  res.json({ status: true });
});

app.post("/get-all-featured-posts", (req, res) => {
  functions.getAllFeaturedPostsIds().then((allFeaturedPostsIds) => {
    res.json(allFeaturedPostsIds);
  });
});

// Cors get reqs
app.get("/get-random-posts-by-no/:no", cors(), (req, res) => {
  let no = req.params.no;
  functions.getPostsByNo(no).then((noOfPosts) => {
    res.json(noOfPosts);
  });
});

app.get("/get-recent-posts-by-no/:no", cors(), (req, res) => {
  let no = req.params.no;
  functions.getRecentPostsByNo(no).then((recentPostsByNo) => {
    res.json(recentPostsByNo);
  });
});

app.get("/get-most-read-posts-by-no/:no", cors(), (req, res) => {
  let no = req.params.no;
  functions.getMostReadPostsByNo(no).then((mostReadPostsByNo) => {
    res.json(mostReadPostsByNo);
  });
});

app.get("/get-featured-posts-by-no/:no", cors(), (req, res) => {
  let no = req.params.no;
  functions.getFeaturedPostsByNo(no).then((featuredPostsByNo) => {
    res.json(featuredPostsByNo);
  });
});

app.get("/get-all-post", cors(), (req, res) => {
  functions.getAllPosts().then((allPosts) => {
    res.json(allPosts);
  });
});

app.get("/get-all-categories", cors(), (req, res) => {
  functions.getAllPostsCategories().then((allCategories) => {
    res.json(allCategories);
  });
});

app.get("/get-post-data/:postId", cors(), (req, res) => {
  let postId = req.params.postId;
  functions.getPostData(postId).then((postData) => {
    res.json(postData);
  });
});

app.listen(PORT, () => {
  console.log(`Server started running at http://localhost:${PORT}`);
});
