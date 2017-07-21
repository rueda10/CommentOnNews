// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

var port = process.env.PORT || 3000;

// Initialize Express
var app = express();

app.use(express.static(__dirname + "/public"));

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// view engine setup
app.engine('handlebars', exphbs({ defaultLayout: "main" }));
app.set('view engine', 'handlebars');

// Database configuration with mongoose
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
} else {
    mongoose.connect("mongodb://localhost/commentonnews");
}
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Routes
// ======

app.get("/", function(req, res) {
   res.redirect('/articles')
});

// A GET request to scrape the echojs website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  request("http://www.echojs.com/", function(error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    var contentsLength = $("article h2").contents().length;
    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function(i, element) {

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
            console.log("COUNTER", i);
            console.log("LENGTH", contentsLength);
            if (i === contentsLength-1) {
                res.redirect('/articles');
            }
        }
      });
    });
  });
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
        console.log(doc);
        res.render('index', { doc: doc });
    }
  });
});

// This will update the favorite flag
app.post("/favorite-articles/:id", function(req, res) {
    var doc = { saved: false };

    if (req.body.type === 'favorite') {
        doc = { saved: true }
    }

    Article.update({_id: req.params.id}, doc, function(error, raw) {
        if (error) {
            console.log(error);
        } else {
            if (req.body.type === 'unfavorite') {
                res.redirect('/favorite-articles');
            } else {
                res.redirect('/articles');
            }
        }
    });
});

// this renders the favorites page
app.get("/favorite-articles", function(req, res) {
    Article.find({saved: true}, function(error, doc) {
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            console.log(doc);
            res.render('favorites', { doc: doc });
        }
    });
});

app.get("/notes/:id", function(req, res) {
    Article.find({_id: req.params.id}, function(error, doc) {
        if (error) {

        } else {
            console.log("NOTE", doc);
            Note.find({article: req.params.id}, function(error, doc) {
                if (error) {

                } else {
                    res.render('notes', { id: req.params.id, notes: doc });
                }
            });
        }
     });
});

app.post("/notes/:id", function(req, res) {
    const content = {
        title: req.body.title,
        body: req.body.body,
        article: req.params.id
    }

    const note = new Note(content);

    note.save(function(error, doc) {
        if (error) {

        } else {
            res.redirect('/notes/' + req.params.id);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  console.log(req.body);
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.redirect('/notes/' + req.params.id);
        }
      });
    }
  });
});


// Listen on port 3000
app.listen(port, function() {
  console.log("App running on port " + port);
});
