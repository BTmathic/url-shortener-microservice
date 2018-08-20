'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');

const cors = require('cors');

const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
const db = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Database setup
const Schema = mongoose.Schema;
const URLSchema = new Schema({
  url: String,      // original URL
  shortURL: Number  // shortened URL that links to the original
});
const URL = mongoose.model('URL', URLSchema);
// get initial number of URLs in database
// async so will not be stored if there is an error or delay accessing the database
let numberOfStoredURLs;
URL.find({}, (error, results) => {
  if (error) {
    console.log('error', error);
  }
  numberOfStoredURLs = results.length;
});

// Database functions
let createAndSaveURL = (longURL) => {
  const url = new URL({
    url: longURL,
    shortURL: numberOfStoredURLs+1
  });
  url.save((error, data) => {
    if (error) {
      console.log('error', error);
    } else {
      console.log('success', data);
      numberOfStoredURLs++;
    }
  });
}

// A naive validator for URLs
function validURL(url) {
  let isValid = true;
  if (url.slice(0,7) !== 'http://' && url.slice(0,8) !== 'https://') {
    isValid = false;
  }
  return isValid;
}

// When the user pushes a new url for the microservice
app.route('/api/shorturl/new').post((req, res) => {
  const queryURL = req.body.url;
  if (validURL(queryURL)) {
    res.json({original_url: queryURL, short_url: numberOfStoredURLs+1});
    // post to database
    createAndSaveURL(queryURL);
  } else {
    res.json({error:'invalid URL'});
  }
});

// When anyone wants to access one of the stores URLs
app.get('/api/shorturl/:index', (req, res) => {
  const shortURL = req.params.index;
  let longURL;
  URL.find({shortURL}, (error, data) => {
    if (error) {
      console.log(error);
    } else {
      
      if (data[0] !== undefined) {
        const longURL = data[0].url;
        res.status(301).redirect(data[0].url);
      } else {
         res.send({error: 'No short URL stored for this address'});
      }
    }
  });
});

app.listen(port, () => {
  console.log('Node.js listening ...');
});