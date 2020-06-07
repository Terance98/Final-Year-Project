const express = require('express');
const upload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const _ = require('lodash')
const fetch = require('node-fetch');
// const Bluebird = require('bluebird');

// fetch.Promise = Bluebird;

const { URLSearchParams } = require('url');
// Make a request for a user with a given ID

var app = express();

app.use(express.static("public/css"));
app.use(express.static("public/js"));
app.use(express.static("match"));

app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });
// const directoryPath = path.join(__dirname, '/uploads');

//Code to get the no.of files in a directory
// function dirList(path) {
//     return new Promise((resolve, reject) => {
//         fs.readdir(path, function (err, files) {
//             if (err) return reject(err);
//             return resolve(files)
//         }
//         )
//     });
// }
app.use(upload()); // configure middleware
app.use(bodyParser.urlencoded({ extended: false }));

//Mongoose Schemas
// const Child = mongoose.model('Child', { name: String, image_ID: String });

//Mongoose model for children
var UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

app.get('/', function (req, res) {
    res.render('index');
});

app.post('/upload', function (req, res) {
    console.log(req.files);
})

app.get("/report", function (req, res) {
    res.render('report');
});


app.post("/report", function (req, res) {
    let childName = req.body.childName;
    if (req.files.upfile) {
        let file = req.files.upfile;
        file.forEach((item, index) => {
            let fileName = _.split(childName, ' ')[0] + (index + 1) + ".jpg";
            let uploadpath = __dirname + '/match/' + fileName;

            item.mv(uploadpath, function (err) {
                if (err) {
                    console.log("File Upload Failed", fileName, err);
                }
                else {
                    console.log("File Uploaded", fileName);
                    // const childData = new Child({ name: childName, image_ID: fileName });
                    // childData.save().then(() => console.log("Child's data is written!"));
                    // console.log(childData);
                }
            })
        });
        const params = new URLSearchParams();
        params.append('name', childName);

        const fetchUrl = "http://127.0.0.1:5000/";
        fetch(fetchUrl, { method: 'POST', body: params })
            .then(res => res.json())
            .then(result => {
                console.log(result);
                if (result['status']) {
                    res.render("after_report")
                }
                res.send("<h1>Training unsuccessful</h1>");
            });
    } else {
        res.send("No File selected !");
        res.end();
    };
});

app.get("/find", function (req, res) {
    res.render('find');
});

app.post("/find", function (req, res) {
    if (req.files.upfile) {
        const name = "suspicious.jpg";
        let uploadpath = __dirname + '/match/suspicious.jpg';
        const file = req.files.upfile;
        file.mv(uploadpath, function (err) {
            if (err) {
                console.log("File Upload Failed", name, err);
            } else {
                console.log("File Uploaded", name);
            }
        });
        const params = new URLSearchParams();

        const fetchUrl = "http://127.0.0.1:6000/";
        fetch(fetchUrl, { method: 'POST', body: params })
            .then(res => res.json())
            .then(results => {
                console.log(results);
                if (results.output) {
                    res.render("after_find", results);
                } else {
                    throw Error;
                }
            }).catch(err => {
                res.render("cannot_find_error");
            })

    } else {
        res.send("No File selected !");
        res.end();
    };
});


app.get("/afterfind", (req, res) => {
    res.render("after_find");
});

app.get("/afterreport", (req, res) => {
    res.render("after_report");
});

app.get('/signin', (req, res) => {
    res.render('signIn');
});

app.post('/signin', async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const ifUserExists = await User.findOne({ email: email, password: password });
        if (ifUserExists) {
            return res.redirect("/");
        } else {
            return res.redirect("/signin");
        }
    } catch (err) {
        console.log(err);
        res.redirect("/signin");
    }

});

app.get('/signup', (req, res) => {
    res.render('signUp');
});

app.post('/signup', async (req, res) => {
    try {
        const firstName = req.body.first_name;
        const lastName = req.body.last_name;
        const email = req.body.email;
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;

        [firstName, lastName, email, password, confirmPassword].forEach(item => { if (!item) return res.redirect("/signup") })

        if (confirmPassword !== password) return res.redirect("/signup");

        const userData = {
            username: firstName + ' ' + lastName,
            email: email,
            password: password
        }

        const ifUserExists = await User.findOne({ email: email });
        console.log(ifUserExists);
        if (ifUserExists) return res.redirect("/signup");

        const user = new User(userData);
        const response = await user.save();
        console.log(response);
        res.redirect('/');
    } catch (err) {
        console.log(err);
        res.redirect('/signup');
    }
});

app.listen(4000, () => console.log(`Example app listening on port 4000!`));