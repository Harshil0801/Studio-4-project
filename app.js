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
app.get('/Newspage', function(req, res) {
	res.render("Newspage.ejs"); // Render home page
});
app.get('/Student',function(req,res){
	res.render('Student.ejs'); // Render login page
   });

app.get('/Staff',function(req,res){
	res.render('Staff.ejs'); // Render login page
   });
   
app.get('/findmore',function(req,res){
	res.render('findmore.ejs');
})
// Login page route
app.get('/login',function(req,res){
 res.render('login.ejs'); // Render login page
});

// Authentication Route (Login)
app.post('/auth', function(req, res) {
    let username = req.body.username;
    let password = req.body.password;
    if (username && password) {
        conn.query('SELECT * FROM users WHERE username=? AND password=?', [username, password],
        function(error, results) {
            if (error) throw error;
            if (results.length > 0) {
				if (results[0].status === 'blocked') {
                    return res.send("Your account has been blocked. Contact admin.");}
                req.session.loggedin = true;
                req.session.username = username;
                req.session.role = results[0].role; // Store role in session

                if (req.session.role === 'admin') {
                    res.redirect('/admin'); // Redirect admins to the admin page
                } else {
                    res.redirect('/membersOnly'); // Redirect regular users
                }
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});

app.get('/admin', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'admin') {
        return res.send("Access denied. Only Admins allowed!");
    }

    // Fetch all users
    conn.query('SELECT * FROM users', function(error, users) {
        if (error) throw error;

        // Fetch students and their courses
        const studentQuery = `
            SELECT users.username, courses.course_name
            FROM users 
            LEFT JOIN enrollments ON users.id = enrollments.student_id
            LEFT JOIN courses ON enrollments.course_id = courses.id
            WHERE users.role = 'student'`;

        conn.query(studentQuery, function(error, students) {
            if (error) throw error;

            // Fetch all courses
            conn.query('SELECT * FROM courses', function(error, courses) {
                if (error) throw error;
                
                // Pass users, students, and courses to admin.ejs
                res.render("admin", { users, students, courses });
            });
        });
    });
});

// Change user role
app.post('/admin/changeRole', function(req, res) {
    const { userId, newRole } = req.body;

    if (!req.session.loggedin || req.session.role !== 'admin') {
        return res.status(403).send("Unauthorized!");
    }

    // Ensure userId is correctly formatted and not duplicated
    conn.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId], function(error) {
        if (error) {
            console.error("Error updating role:", error);
            req.session.message = "Error updating role!";
            return res.redirect('/admin');
        }
        req.session.message = "User role updated successfully!";
        res.redirect('/admin');
    });
});


// Register page route
app.get('/Register', function(req, res) {
	res.render('Register.ejs'); // Render registration page
});
// Admin Adds a Course
app.post('/admin/addCourse', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'admin') {
        return res.send("Access denied. Only Admins allowed!");
    }

    const { course_name, description } = req.body;
    conn.query('INSERT INTO courses (course_name, description) VALUES (?, ?)', 
    [course_name, description], function(error) {
        if (error) {
            console.error("Error adding course:", error);
            return res.status(500).send("Database error");
        }
        res.redirect('/admin');
    });
});

// Register Route
app.post('/register', function(req, res) {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;

    if (username && email && password) {
        // Check if the first user is being registered
        conn.query('SELECT COUNT(*) AS count FROM users', function(err, result) {
            if (err) throw err;
            let userCount = result[0].count;

            // First user becomes admin, others default to user
            let role = (userCount === 0) ? 'admin' : 'user';

            conn.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, password, role], function(err) {
                if (err) throw err;
                console.log('User Registered Successfully!');
                res.redirect('/login');
            });
        });
    } else {
        res.send("All fields are required!");
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

// About page route
app.get('/about', function(req, res) {
    res.render('about', { title: 'About' });
});

// Gallery page route
app.get('/Gallery',function(req,res){
	res.render('Gallery',{title: 'Gallery'});
});

// Contact page route
app.get('/Contact',function(req,res){
	res.render('Contact',{title:'My Contact'});
});
// Home route
app.get('/', function(req, res) {
    res.render("home"); // Render home page
});

//courses route
app.get('/Courses', function(req, res) {
    conn.query('SELECT * FROM courses', function(error, results) {
        if (error) {
            console.error("Error fetching courses: ", error);
            return res.status(500).send("Database error");
        }
        res.render('Courses', { courses: results });
    });
});

// BLOCK OR UNBLOCK USERS
app.post('/admin/toggleBlock', function(req, res) {
    const { userId, currentStatus } = req.body;

    if (!req.session.loggedin || req.session.role !== 'admin') {
        return res.status(403).send("Unauthorized!");
    }

    // Toggle status between 'blocked' and 'unblocked'
    const newStatus = currentStatus === 'blocked' ? 'unblocked' : 'blocked';

    conn.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId], function(error) {
        if (error) {
            console.error("Error updating user status:", error);
            req.session.message = "Error updating user status!";
            return res.redirect('/admin');
        }
        req.session.message = `User ${newStatus} successfully!`;
        res.redirect('/admin');
    });
});

// DELETE COURSES
app.post('/admin/deleteCourse', function(req, res) {
    const { courseId } = req.body;
    if (!req.session.loggedin || req.session.role !== 'admin') {
        return res.status(403).send("Unauthorized!");
    }

    conn.query('DELETE FROM courses WHERE id = ?', [courseId], function(error) {
        if (error) {
            console.error("Error deleting course:", error);
            return res.status(500).send("Database error!");
        }
		req.session.message = "Course deleted successfully!";
        res.redirect('/admin');
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
