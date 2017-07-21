// Require mongoose
var mongoose = require("mongoose");
// Create Schema class
var Schema = mongoose.Schema;

// Create article schema
var ArticleSchema = new Schema({
  // title is a required string
    title: {
        type: String,
        required: true
    },
    // link is a required string
    link: {
        type: String,
        required: true
    },
    //
    saved: {
        type: Boolean,
        required: true,
        default: false
    }
});

// Create the Article model with the ArticleSchema
var Article = mongoose.model("Article", ArticleSchema);

// Export the model
module.exports = Article;
