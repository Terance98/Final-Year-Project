const express = require('express');
const upload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const ejs = require('ejs');
const _ = require('lodash')
// Make a request for a user with a given ID

var app = express();

app.use(express.static("public/css"));
app.use(express.static("public/js"));
app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });
//joining path of directory 
const directoryPath = path.join(__dirname, '/uploads');

function dirList(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, function (err, files) {
      if (err) return reject(err);
      return resolve(files)
    }
    )
  });
}

app.use(upload()); // configure middleware
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
  res.render('index');
  // dirList(directoryPath);
});


//Mongoose Schemas
const Child = mongoose.model('Child', { name: String, image_ID: String });

// const kid = new Child({ name: 'Tim', image_ID: "k7.jpg" });

// kid.save().then(() => console.log('Child data is written!'));

app.post('/upload', function (req, res) {
  console.log(req.files);

})

app.get("/report", function (req, res) {
  res.render('report');
});

app.post("/report", function (req, res) {
  let childName = req.body.childName;
  if (req.files.upfile) {
    //Unpacking the promise here
    dirList(directoryPath).then(files => {
      // if(!files){
      //   let length = 1
      // }
      // else{
        let length = files.length;
      // }
      let file = req.files.upfile;
      // console.log(file);
      // let type = file.mimetype;
      file.forEach((item, index) => {
        let fileName = 'k' + (length + index + 1 )+ '.jpg';
        let uploadpath = __dirname + '/uploads/' + fileName;

        item.mv(uploadpath, function (err) {
        if (err) {
          console.log("File Upload Failed", fileName, err);
          // res.send("Error Occured!")
        }
        else {
          console.log("File Uploaded", fileName);
          const childData = new Child({ name: childName, image_ID: fileName });
          childData.save().then(() => console.log("Child's data is written!"));
          console.log(childData);
          // res.send('Done! Uploading files');
        }
      })});
    });
    res.send("done!!");
  }//
  else {
    res.send("No File selected !");
    res.end();
  };

 
});

app.get("/find", function (req, res) {
  res.render('find');
});

app.post("/find", function (req, res) {
  if (req.files.upfile) {
    const name = "me.jpg";
    let uploadpath = __dirname + '/match/me.jpg';
    const file = req.files.upfile;
    file.mv(uploadpath, function (err) {
      if (err) {
        console.log("File Upload Failed", name, err);
        // res.send("Error Occured!")
      }
      else {
        console.log("File Uploaded", name);
        // res.send('Done! Uploading files')
      }
    });
    //Python check.py , Run the python server!!
    axios.get('http://127.0.0.1:5000/')
      .then(function (response) {
        // handle success
        console.log(response.data.data[0]);
        // res.send(response.data);
        
        // Child.findOne({'image_ID': response.data.data[0]}, function(err, res){
        //   console.log(res);
        // });
        Child.find({ image_ID: { $in: response.data.data} }, function (err, resp) {
          // console.log(res.name);
          const output = resp.map(child => child.name);
          var result = _.head(_(output)
            .countBy()
            .entries()
            .maxBy(_.last));

          res.send('<h1>Match was found with: '+result+'</h1>');
          
        }).then(()=>console.log("Match was found")).catch(()=> console.log("No match was found"));
        // console.log(op);
        //
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .finally(function () {
        // always executeds
      });

  }//
  else {
    res.send("No File selected !");
    res.end();
  };
});

app.listen(4000, () => console.log(`Example app listening on port 4000!`));