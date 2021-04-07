const fs = require("fs");
const { resolve, reject } = require("promise");
const Promise = require("promise");
// const fileName = "../views/database/data.json";
// const db = require(fileName);
const db = require("../config/connection");
const collections = require("../config/collections");
const bcrypt = require("bcryptjs");
const { response } = require("express");
const adminData = {
  id: "$2a$10$ArlxEedhxTmRYd1pkQ3mjus6yacCtDPULgpasIYegbJsqBTdchlIu",
  name: "$2a$10$O6FD3GzX/4/KorY.gIaeJuWiXTCnVqdjBSLtD1YTU.0JT8OzizgeC",
  password: "$2a$10$YNVhTzs.zUsVjf74/tsHju2PiF.lBga3v.Ie2jdgXHowFvfoFiFgG",
  email: "$2a$10$97e.rrUM0rVey29R/st5UuGGB8OsNbmoI/qh3VvtpIQBpxHrYMYHa",
};
const Moment = require("moment");

module.exports = {
  getAllPosts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .find()
        .toArray()
        .then((allPosts) => {
          resolve(allPosts);
        });
    });
  },
  createPost: (reqData) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .insertOne(reqData)
        .then((response) => {
          resolve(response);
        });
    });
  },
  checkAdminLogin: (reqData) => {
    return new Promise((resolve, reject) => {
      bcrypt.compare(reqData.adminName, adminData.name).then((status) => {
        if (status) {
          bcrypt.compare(reqData.adminId, adminData.id).then((status) => {
            if (status) {
              bcrypt
                .compare(reqData.adminEmail, adminData.email)
                .then((status) => {
                  if (status) {
                    bcrypt
                      .compare(reqData.adminPassword, adminData.password)
                      .then((status) => {
                        if (status) {
                          resolve({ adminLogin: true });
                        } else {
                          resolve({
                            loginErrKey: "adminPassword",
                            adminLogin: false,
                          });
                        }
                      });
                  } else {
                    resolve({ loginErrKey: "adminEmail", adminLogin: false });
                  }
                });
            } else {
              resolve({ loginErrKey: "adminId", adminLogin: false });
            }
          });
        } else {
          resolve({ loginErrKey: "adminName", adminLogin: false });
        }
      });
    });
  },
  deletePost: (postId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .removeOne({ postId: postId })
        .then((response) => {
          db.get()
            .collection(collections.MOST_READ_POSTS)
            .removeOne({ postId: postId })
            .then((response) => {
              db.get()
                .collection(collections.FEATURED_POSTS)
                .removeOne({ postId: postId })
                .then((response) => {
                  resolve(response);
                });
            });
        });
    });
  },
  getPostDetails: (postId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .findOne({ postId: postId })
        .then((postData) => {
          resolve(postData);
        });
    });
  },
  dltImage: (postId, type) => {
    return new Promise((resolve, reject) => {
      fs.unlink(`./public/images/${type}-images/${postId}.jpg`, function (err) {
        if (err) throw err;
        // if no error, file has been deleted successfully
        console.log("File deleted!");
      });
    });
  },
  updatePost: (postId, reqData) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .updateOne(
          { postId: postId },
          {
            $set: {
              date: reqData.date,
              postDate: reqData.postDate,
              mainTitle: reqData.mainTitle,
              postCategory: reqData.postCategory,
              postSubtitle: reqData.postSubtitle,
              mainDescription: reqData.mainDescription,
              subDescription: reqData.subDescription,
              thirdDescription: reqData.thirdDescription,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  getPostsByNo: (no) => {
    return new Promise((resolve, reject) => {
      function getRandom(arr, n) {
        if (arr.length < n) {
          return arr;
        } else {
          var result = new Array(n),
            len = arr.length,
            taken = new Array(len);
          if (n > len)
            throw new RangeError(
              "getRandom: more elements taken than available"
            );
          while (n--) {
            var x = Math.floor(Math.random() * len);
            result[n] = arr[x in taken ? taken[x] : x];
            taken[x] = --len in taken ? taken[len] : len;
          }
          return result;
        }
      }
      db.get()
        .collection(collections.ALL_POSTS)
        .find({})
        .toArray()
        .then((allPosts) => {
          resolve(getRandom(allPosts, no));
        });
    });
  },
  getRecentPostsByNo: (no) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .find({})
        .toArray()
        .then((allPosts) => {
          const allRecentPosts = allPosts.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
          });
          let recentPostsByNo = allRecentPosts.slice(0, no);
          resolve(recentPostsByNo);
        });
    });
  },
  addToMostReadPosts: (postId) => {
    db.get()
      .collection(collections.ALL_POSTS)
      .findOne({ postId: postId })
      .then((postData) => {
        db.get().collection(collections.MOST_READ_POSTS).insertOne(postData);
      });
  },
  getAllMostReadPosts: () => {
    return new Promise(async (resolve, reject) => {
      let mostReadPosts = await db
        .get()
        .collection(collections.MOST_READ_POSTS)
        .find({})
        .toArray();
      resolve(mostReadPosts);
    });
  },
  clearMostReadPostsList: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.MOST_READ_POSTS)
        .removeMany({})
        .then(() => {
          resolve();
        });
    });
  },
  getAllMostReadPostsIds: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.MOST_READ_POSTS)
        .find({})
        .toArray()
        .then((mostReadPosts) => {
          let allMostReadPostIds = [];
          mostReadPosts.forEach((itm) => {
            allMostReadPostIds.push(itm.postId);
          });
          resolve(allMostReadPostIds);
        });
    });
  },
  clearFeaturedPostsList: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FEATURED_POSTS)
        .removeMany({})
        .then(() => {
          resolve();
        });
    });
  },
  addToFeaturedPosts: (postId) => {
    db.get()
      .collection(collections.ALL_POSTS)
      .findOne({ postId: postId })
      .then((postData) => {
        db.get().collection(collections.FEATURED_POSTS).insertOne(postData);
      });
  },
  getAllFeaturedPostsIds: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FEATURED_POSTS)
        .find({})
        .toArray()
        .then((mostReadPosts) => {
          let allMostReadPostIds = [];
          mostReadPosts.forEach((itm) => {
            allMostReadPostIds.push(itm.postId);
          });
          resolve(allMostReadPostIds);
        });
    });
  },
  getMostReadPostsByNo: (no) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.MOST_READ_POSTS)
        .find({})
        .toArray()
        .then((allMostReadPosts) => {
          let mostReadPostsByNo = allMostReadPosts.slice(0, no);
          resolve(mostReadPostsByNo);
        });
    });
  },
  getFeaturedPostsByNo: (no) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FEATURED_POSTS)
        .find({})
        .toArray()
        .then((allFeaturedPosts) => {
          let featuredPostsByNo = allFeaturedPosts.slice(0, no);
          resolve(featuredPostsByNo);
        });
    });
  },
  getAllPostsCategories: () => {
    return new Promise((resolve, reject) => {
      var allCategories = [];
      db.get()
        .collection(collections.ALL_POSTS)
        .find({})
        .toArray()
        .then((allPosts) => {
          allPosts.forEach((itm) => {
            allCategories.push(itm.postCategory);
          });
          resolve(allCategories);
        });
    });
  },
  getPostData: (postId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ALL_POSTS)
        .findOne({ postId: postId })
        .then((postData) => {
          resolve(postData);
        });
    });
  },
};
