var express = require('express');
var app = express();
const mysql = require('mysql');
const session = require('express-session');

const conn = require('./dbconfig'); // Importing database configuration

// Setting up EJS template engine
app.set('view engine','ejs');
app.use('/public', express.static('public'));

// Setting up session middleware
app.use(session({
	secret: 'yoursecret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.get('/', function(req, res) {
	res.render("home"); // Render home page
});

app.get('/Student',function(req,res){
	res.render('Student.ejs'); // Render login page
   });

app.get('/Staff',function(req,res){
	res.render('Staff.ejs'); // Render login page
   });
   

// Login page route
app.get('/login',function(req,res){
 res.render('login.ejs'); // Render login page
});

// Authentication route
app.post('/auth',function(req,res){
	let username = req.body.username;
	let password = req.body.password;
	if (username && password) {
		conn.query('SELECT * FROM users WHERE username=? AND password=?',[username,password],
		function(error,results,fields){
			if (error) throw error;
			if(results.length > 0) {
				req.session.loggedin=true;
				req.session.username=username;
				res.redirect('/membersOnly'); // Redirect to members-only page upon successful login
			}else {
				res.send('Incorrect Username and/or Password!'); // Display error message for incorrect login credentials
			}
			res.end();
		});
	}else{
		res.send ('Please enter Username and Password!'); // Display error message for missing username or password
		res.end();
	}
});

// Register page route
app.get('/Register', function(req, res) {
	res.render('Register.ejs'); // Render registration page
});

// Register user route
app.post('/register',function(req,res){
	let username=req.body.username;
	let password=req.body.password;
	let email=req.body.email;
	if (username && password) {
		var sql = `INSERT INTO users (username, email, password) VALUES ("${username}", "${email}", "${password}")`;
		conn.query(sql, function(err, result) {
			if (err) throw err;
			console.log('record inserted');
			res.render('login'); // Render login page after successful registration
		})
	}
	else {
		console.log("Error");
	}
});

// Members-only page route
app.get('/membersOnly', function (req, res,next) {
	if (req.session.loggedin) {
		res.render('membersOnly'); // Render members-only page if user is logged in
	} else {
		res.send('Please login to view this page!'); // Display message if user is not logged in
	}
});

// Logout route
app.get('/logout',(req,res) => {
    req.session.destroy(); // Destroy session on logout
    res.redirect('/'); // Redirect to home page after logout
});

// Home page route
app.get('/', function (req,res){
    res.render("home",{title:"My home"});
})

// About page route
app.get('/about', function(req, res) {
    res.render('about', { title: 'About' });
});

// Gallery page route
app.get('/Gallery',function(req,res){
	res.render('Gallery',{title: 'Gallery'});
});

// Courses page route
app.get('/Courses', function (req,res){
    res.render('Courses',{title:'My Courses'});
});

// Contact page route
app.get('/Contact',function(req,res){
	res.render('Contact',{title:'My Contact'});
});
// Home route
app.get('/', function(req, res) {
    res.render("home"); // Render home page
});

// Courses page route
app.get('/Courses', function(req, res) {
    // Fetch courses from the database using the external connection
    conn.query('SELECT * FROM courses', function(error, results, fields) {
        if (error) throw error;
        res.render('Courses', { courses: results });  // Pass courses data to the view
    });
});

// Course details route
app.get('/course-details/:courseId', function(req, res) {
    const courseId = req.params.courseId;
    // Fetch specific course details based on the courseId
    conn.query('SELECT * FROM courses WHERE id = ?', [courseId], function(error, result, fields) {
        if (error) throw error;
        if (result.length > 0) {
            res.render('course-details', { course: result[0] }); // Render course details page
        } else {
            res.send('Course not found');
        }
    });
});

// Contact form submission route
app.post('/contact', function(req, res) {
	// Handling form submission logic
	const name = req.body.name;
	const email = req.body.email;
	const message = req.body.message;
	console.log('Name:', name);
	console.log('Email:', email);
	console.log('Message:', message);
	res.send('Your message has been received! Wait till your next life for reply!'); // Send response after form submission
});

// Listening on port 3000 or environment port
app.listen(process.env.port||3000);
console.log('Running at Port 3000'); // Console log to indicate server is running
