'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Database setup
const Schema = mongoose.Schema;
const URLSchema = new Schema({
  url: String,
  shortURL: Number // our short URLs will just be positive integers
});
const URL = mongoose.model('URL', URLSchema);
// get initial number of URLs in database
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

// A naive validator for URLs, we only require a URL to start with http:// or https:// to be considered valid
function validURL(url) {
  let isValid = true;
  if (url.slice(0,7) !== 'http://' && url.slice(0,8) !== 'https://') {
    isValid = false;
  }
  return isValid;
}

// push a new URL
app.route('/api/shorturl/new').post((req, res) => {
  const queryURL = req.body.url;
  if (validURL(queryURL)) {
    res.json({original_url: queryURL, short_url: numberOfStoredURLs+1});
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