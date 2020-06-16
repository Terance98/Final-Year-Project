require('dotenv').config();
const express = require('express');
const upload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const _ = require('lodash')
const fetch = require('node-fetch');
var cookieParser = require('cookie-parser');
const accountSid = process.env.TWILIO_ACCOUNT;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const TwilioClient = require('twilio')(accountSid, authToken);
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');

var options = { // service: 'SendGrid',
    auth: { // api_user: 'apikey',
        api_key: process.env.SENDGRID_KEY
    }
}

var EmailClient = nodemailer.createTransport(sgTransport(options));
// const Bluebird = require('bluebird');
// hello
// hai
// fetch.Promise = Bluebird;

const {URLSearchParams} = require('url');
// Make a request for a user with a given ID

var app = express();

app.use(express.static("public/css"));
app.use(express.static("public/js"));
app.use(express.static("match"));

app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true});
// const directoryPath = path.join(__dirname, '/uploads');

// Code to get the no.of files in a directory
// function dirList(path) {
//     return new Promise((resolve, reject) => {
//         fs.readdir(path, function (err, files) {
//             if (err) return reject(err);
//             return resolve(files)
//         }
//         )
//     });
// }
app.use(cookieParser());
app.use(upload()); // configure middleware
app.use(bodyParser.urlencoded({extended: false}));

// Mongoose Schemas
// const Child = mongoose.model('Child', { name: String, image_ID: String });

// Mongoose model for children
const Schema = mongoose.Schema;

var UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    password: String
}, {timestamps: true});

const User = mongoose.model('User', UserSchema);

// const ChildSchema = new mongoose.Schema({
//     name: String,
//     image_ID: String,
//     parent: { type: Schema.Types.ObjectId, ref: 'User' }
// }, { timestamps: true });

// const Child = mongoose.model('Child', ChildSchema);

const Missing = mongoose.model('Missing', new Schema({}), 'missing');

function tConvert(time) { // Check correct time format and split into components
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
        time = time.slice(1); // Remove full string match value
        time[5] = + time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
        time[0] = + time[0] % 12 || 12; // Adjust hours
    }
    return time.join(''); // return adjusted time or original string
}app.get('/', function (req, res) {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    
    res.render('index');
});

app.post('/upload', function (req, res) {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    
})

app.get("/report", function (req, res) {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    

    res.render('report');
});


app.post("/report", function (req, res) {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    

    try {
        const childName = req.body.childName;
        const files = [];
        if (Array.isArray(req.files.upfile)) {
            files.push(... req.files.upfile);
        } else {
            files.push(req.files.upfile);
        }
        if (files.length) {
            files.forEach((item, index) => { // use uuid instead of childName
                let fileName = _.split(childName, ' ')[0] + (index + 1) + ".jpg";
                let uploadpath = __dirname + '/match/' + fileName;

                item.mv(uploadpath, function (err) {
                    if (err) {
                        console.log("File Upload Failed", fileName, err);
                    } else {
                        console.log("File Uploaded", fileName);
                        // Instead of writing to db here, pass it on to the python API and handle data insertion from there.
                        // const childData = new Child({ name: childName, image_ID: fileName, parent: userID });
                        // console.log(childData);
                        // childData.save().then(() => console.log("Child's data is written!"));
                    }
                })
            });
            // }
            const params = new URLSearchParams();
            for (let key of Object.keys(req.body)) {
                params.append(key, req.body[key]);
            }
            // params.append('name', childName);

            const fetchUrl = "http://127.0.0.1:5000/";
            fetch(fetchUrl, {
                method: 'POST',
                body: params
            }).then(res => res.json()).then(result => {
                console.log(result);
                if (result['status']) {
                    return res.render("after_report")
                }
                return res.send("<h1>Training unsuccessful</h1>");
            }).catch(err => {
                console.log("API error - ", err);
                return res.redirect("/report");
            })
        } else {
            res.send("No File selected !");
            res.end();
        };
    } catch (err) {
        console.log(err);
        return res.redirect("/report");
    }
});

app.get("/find", function (req, res) {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    

    res.render('find');
});

app.post("/find", function (req, res) {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    
    if (! req.body.lat || ! req.body.long) 
        return res.redirect("/find");
    
    try {
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
            fetch(fetchUrl, {
                method: 'POST',
                body: params
            }).then(res => res.json()).then(async results => {
                if (results.output.length) {
                    const childPersonId = results.output[0].person_id;

                    const childData = await Missing.findOne({azure_face_id: childPersonId});
                    const reportedUser = await User.findOne({_id: userID});
                    // const childName = childData.name;
                    let {name: childName, email: guardianEmail, phone: guardianPhone} = JSON.parse(JSON.stringify(childData));
                    const {username: reportedUserName, email: reportedUserEmail, phone: reportedUserPhone} = reportedUser;
                    const childSpottedLocationUrl = `http://maps.google.com/?q=${
                        req.body.lat
                    },${
                        req.body.long
                    }`;

                    if (!guardianPhone) 
                        guardianPhone = "+919496342920";
                    
                    if (!guardianEmail) 
                        guardianEmail = "thomasterance2020@cs.ajce.in";
                    
                    // For todays date;
                    Date.prototype.today = function () {
                        return((this.getDate() < 10) ? "0" : "") + this.getDate() + "/" + (
                        ((this.getMonth() + 1) < 10) ? "0" : ""
                    ) + (this.getMonth() + 1) + "/" + this.getFullYear();
                    }

                    // For the time now
                    Date.prototype.timeNow = function () {
                        return((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + (
                        (this.getMinutes() < 10) ? "0" : ""
                    ) + this.getMinutes() + ":" + (
                        (this.getSeconds() < 10) ? "0" : ""
                    ) + this.getSeconds();
                    }

                    const dateTime = new Date().today() + ' at ' + tConvert(new Date().timeNow());
                    // const guardianEmail = "thomasterance2020@cs.ajce.in";
                    // const guardianPhone = "+919496342920";
                    const foundChildText = `Your child ${childName} was found on ${dateTime}. Here are the details of the person who found your child,\n\nName - ${reportedUserName}\nEmail - ${reportedUserEmail}\nPhone - ${reportedUserPhone}\n\nClick the link to get the spotted location : ${childSpottedLocationUrl}`;
                    // console.log(foundChildText);
                    const email = {
                        from: 'thomasterance98@gmail.com',
                        to: guardianEmail,
                        subject: 'Your child was found',
                        text: foundChildText
                    };

                    // Send an email
                    EmailClient.sendMail(email, function (err, info) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Email sent!');
                        }
                    });

                    // Send an sms
                    TwilioClient.messages.create({body: foundChildText, from: '+16123954705', to: guardianPhone}).then(message => console.log('Message sent!')).catch(err => console.log(err));

                    res.render("after_find", results);

                    // Also send mail and sms to the user who found the child
                } else {
                    console.log('No match found!');
                    throw Error;
                }
            }).catch(err => {
                console.log(err);
                res.render("cannot_find_error");
            })

        } else {
            res.send("No File selected !");
            res.end();
        };
    } catch (err) {
        console.log(err);
        res.redirect("/find");
    }
});


app.get("/afterfind", (req, res) => {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    

    res.render("after_find");
});

app.get("/afterreport", (req, res) => {
    const userID = req.cookies.userID;
    if (! userID) 
        return res.redirect("/signin");
    

    res.render("after_report");
});

app.get('/signin', (req, res) => {
    const userID = req.cookies.userID;
    if (userID) 
        return res.redirect("/");
    

    res.render('signIn');
});

app.post('/signin', async (req, res) => {
    const userID = req.cookies.userID;
    if (userID) 
        return res.redirect("/");
    

    try {
        const email = req.body.email;
        const password = req.body.password;

        const ifUserExists = await User.findOne({email: email, password: password});
        if (ifUserExists) { // Setting the cookie value
            res.cookie('userID', ifUserExists._id, {maxAge: 3600000}).redirect('/')
        } else {
            return res.redirect("/signin");
        }
    } catch (err) {
        console.log(err);
        res.redirect("/signin");
    }

});

app.get('/signup', (req, res) => {
    const userID = req.cookies.userID;
    if (userID) 
        return res.redirect("/");
    

    res.render('signUp');
});

app.post('/signup', async (req, res) => {
    const userID = req.cookies.userID;
    if (userID) 
        return res.redirect("/");
    

    try {
        const firstName = req.body.first_name;
        const lastName = req.body.last_name;
        const email = req.body.email;
        const phone = req.body.phone;
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;

        [
            firstName,
            lastName,
            email,
            password,
            phone,
            confirmPassword
        ].forEach(item => {
            if (!item) 
                return res.redirect("/signup")
            
        })

        if (confirmPassword !== password) 
            return res.redirect("/signup");
        

        const userData = {
            username: firstName + ' ' + lastName,
            email: email,
            phone: phone,
            password: password
        }

        const ifUserExists = await User.findOne({email: email});
        if (ifUserExists) 
            return res.redirect("/signup");
        

        const user = new User(userData);
        const response = await user.save();
        res.redirect('/');
    } catch (err) {
        console.log(err);
        res.redirect('/signup');
    }
});

app.get("/signout", (req, res) => res.clearCookie('userID').redirect("/"))

app.get('/get-details/:personId', async (req, res) => {
    const personId = req.params.personId;
    try {
        const childDetails = JSON.parse(JSON.stringify(await Missing.findOne({azure_face_id: personId})));
        childDetails.fname = childDetails.name.split(" ")[0];
        res.render('details', {childDetails});


    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});

app.get('/test', (req, res) => {
    res.sendFile('test2.html', {
        root: path.join(__dirname, '/views')
    })
});

app.get('/details', (req, res) => res.render('details'));

app.listen(4000, () => console.log(`Example app listening on port 4000!`));
