// Required Modules
var express = require('express');
var app = express();
const mysql = require('mysql');
const session = require('express-session');

// DB Connection
const conn = require('./dbconfig');

// Middleware & Config
app.set('view engine','ejs');
app.use('/public', express.static('public'));
app.use(session({ secret: 'yoursecret', resave: true, saveUninitialized: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => res.render("home"));
app.get('/Newspage', (req, res) => res.render("Newspage.ejs"));
app.get('/Student', (req, res) => res.render('Student.ejs'));
app.get('/Staff', (req, res) => res.render('Staff.ejs'));
app.get('/findmore', (req, res) => res.render('findmore.ejs'));
app.get('/login', (req, res) => res.render('login.ejs'));

// Authentication
app.post('/auth', function(req, res) {
    const { username, password } = req.body;

    if (username && password) {
        conn.query('SELECT * FROM users WHERE username=? AND password=?', [username, password], function(error, results) {
            if (error) throw error;

            if (results.length > 0) {
                const user = results[0];

                // Blocked user
                if (user.status === 'blocked') {
                    return res.send("❌ Your account has been blocked. Contact admin.");
                }

                // Pending teacher
                if (user.role === 'teacher' && user.status === 'pending') {
                    return res.send("⏳ Your request is still pending approval by the admin.");
                }

                // ⛔ Unpaid student check (only applies to students)
                if (user.role === 'student' && user.fee_paid === 0) {
                    return res.send("💳 Please pay your fee before logging in.");
                }

                // ✅ Valid Login
                req.session.loggedin = true;
                req.session.username = username;
                req.session.role = user.role;

                if (user.role === 'admin') return res.redirect('/admin');
                if (user.role === 'teacher') return res.redirect('/facultydashboard');
                return res.redirect('/membersOnly');
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});

// Admin Dashboard
app.get('/admin', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'admin') return res.send("Access denied. Only Admins allowed!");
    conn.query('SELECT * FROM users', function(error, users) {
        if (error) throw error;
        const studentQuery = `
            SELECT users.username, courses.course_name
            FROM users 
            LEFT JOIN enrollments ON users.id = enrollments.student_id
            LEFT JOIN courses ON enrollments.course_id = courses.id
            WHERE users.role = 'student'`;
        conn.query(studentQuery, function(error, students) {
            if (error) throw error;
            conn.query('SELECT * FROM courses', function(error, courses) {
                if (error) throw error;
                res.render("admin", { users, students, courses });
            });
        });
    });
});

app.post('/admin/approveTeacher', function(req, res) {
    const { userId } = req.body;
    conn.query('UPDATE users SET status = "unblocked" WHERE id = ?', [userId], function(err) {
        if (err) return res.status(500).send("Error updating status");
        res.redirect('/admin');
    });
});

// Faculty Dashboard (Only after admin approval)
app.get('/facultydashboard', function(req, res) {
    if (req.session.loggedin && req.session.role === 'teacher') {
        conn.query('SELECT status FROM users WHERE username = ?', [req.session.username], function(err, result) {
            if (err) return res.status(500).send("Database error.");
            if (!result.length || result[0].status !== 'unblocked') {
                return res.send("Access denied. Your teacher registration is still pending admin approval.");
            }

            const studentQuery = `
                SELECT users.id, users.username, users.status, courses.course_name
                FROM users
                LEFT JOIN enrollments ON users.id = enrollments.student_id
                LEFT JOIN courses ON enrollments.course_id = courses.id
                WHERE users.role = 'student'
            `;
            conn.query(studentQuery, function(error, students) {
                if (error) throw error;
                conn.query('SELECT * FROM courses', function(error, courses) {
                    if (error) throw error;
                    res.render('FacultyDashboard', { students, courses });
                });
            });
        });
    } else {
        res.send('Access denied. Only teachers can view this page.');
    }
});

// Faculty Add Course
app.post('/faculty/addCourse', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'teacher') return res.status(403).send("Unauthorized!");
    const { course_name, description, fee } = req.body;
    conn.query('INSERT INTO courses (course_name, description, fee) VALUES (?, ?, ?)', [course_name, description, fee], function(error) {
        if (error) return res.status(500).send("Database error");
        res.redirect('/facultydashboard');
    });
});

// Faculty Delete Course
app.post('/faculty/deleteCourse', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'teacher') return res.status(403).send("Unauthorized!");
    const { courseId } = req.body;
    conn.query('DELETE FROM courses WHERE id = ?', [courseId], function(error) {
        if (error) return res.status(500).send("Database error");
        res.redirect('/facultydashboard');
    });
});

// Faculty Toggle Block
app.post('/faculty/toggleBlock', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'teacher') return res.status(403).send("Unauthorized!");
    const { userId, currentStatus } = req.body;
    const newStatus = currentStatus === 'blocked' ? 'unblocked' : 'blocked';
    conn.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId], function(error) {
        if (error) return res.status(500).send("Database error");
        res.redirect('/facultydashboard');
    });
});

// Admin Change Role
app.post('/admin/changeRole', function(req, res) {
    const { userId, newRole } = req.body;
    if (!req.session.loggedin || req.session.role !== 'admin') return res.status(403).send("Unauthorized!");
    conn.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId], function(error) {
        if (error) return res.redirect('/admin');
        res.redirect('/admin');
    });
});

// Admin Add/Delete Courses
app.post('/admin/addCourse', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'admin') return res.send("Access denied.");
    const { course_name, description, fee_amount } = req.body;
    conn.query('INSERT INTO courses (course_name, description, fee_amount) VALUES (?, ?, ?)', [course_name, description, fee_amount], function(error) {
        if (error) return res.status(500).send("Database error");
        res.redirect('/admin');
    });
});

app.post('/admin/deleteCourse', function(req, res) {
    const { courseId } = req.body;
    if (!req.session.loggedin || req.session.role !== 'admin') return res.status(403).send("Unauthorized!");
    conn.query('DELETE FROM courses WHERE id = ?', [courseId], function(error) {
        if (error) return res.status(500).send("Database error!");
        res.redirect('/admin');
    });
});

// Admin Block Toggle
app.post('/admin/toggleBlock', function(req, res) {
    const { userId, currentStatus } = req.body;
    if (!req.session.loggedin || req.session.role !== 'admin') return res.status(403).send("Unauthorized!");
    const newStatus = currentStatus === 'blocked' ? 'unblocked' : 'blocked';
    conn.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId], function(error) {
        if (error) return res.redirect('/admin');
        res.redirect('/admin');
    });
});

// Register
app.get('/Register', (req, res) => {
    conn.query('SELECT * FROM courses', (error, results) => {
        if (error) return res.status(500).send("Error loading registration page.");
        res.render('Register', { courses: results });
    });
});

app.post('/register', function(req, res) {
    const { username, email, password, role, courseId } = req.body;

    if (!username || !email || !password || !role) {
        return res.send("All fields are required!");
    }

    conn.query('SELECT COUNT(*) AS count FROM users', function(err, result) {
        if (err) throw err;

        const assignedRole = result[0].count === 0 ? 'admin' : role;
        const status = (assignedRole === 'teacher') ? 'pending' : 'unblocked';

        conn.query('INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
        [username, email, password, assignedRole, status], function(err, userResult) {
            if (err) throw err;

            const userId = userResult.insertId;

            if (assignedRole === 'student' && courseId) {
                conn.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
                [userId, courseId], function(err) {
                    if (err) throw err;

                    // Redirect to fee deduction page after enrollment
                    return res.redirect(`/fee-deduction?studentId=${userId}`);
                });
            } else {
                res.redirect('/login');
            }
        });
    });
});


// Members Only
app.get('/membersOnly', function (req, res) {
    if (req.session.loggedin) res.render('membersOnly');
    else res.send('Please login to view this page!');
});
app.get('/funding', (req, res) => {
    res.render('findFunding');
  });
  
  app.get('/study-options', (req, res) => {
    res.render('studyOptions');
  });
  
app.get('/timetable', (req, res) => {
    res.render('timetable'); 
});

  

// Courses
app.get('/Courses', function(req, res) {
    conn.query('SELECT * FROM courses', function(error, results) {
        if (error) return res.status(500).send("Database error");
        res.render('Courses', { courses: results });
    });
});

// Course Details
app.get('/course-details/:courseId', function(req, res) {
    const courseId = req.params.courseId;
    conn.query('SELECT * FROM courses WHERE id = ?', [courseId], function(error, result) {
        if (error) throw error;
        if (result.length > 0) res.render('course-details', { course: result[0] });
        else res.send('Course not found');
    });
});

// Contact
app.get('/Contact', (req, res) => res.render('Contact', { title: 'My Contact' }));
app.post('/contact', function(req, res) {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).send("All fields are required!");
    }

    const sql = 'INSERT INTO contactus (name, email, comment) VALUES (?, ?, ?)';
    conn.query(sql, [name, email, message], function(error, result) {
        if (error) {
            console.error("Error saving contact form:", error);
            return res.status(500).send("Database error occurred!");
        }
        console.log("Message submitted successfully:", result);
        res.send("Your message has been submitted successfully!");
    });
});

// Fee Deduction Page
app.get('/fee-deduction', (req, res) => {
    const studentId = req.query.studentId;

    const sql = `
        SELECT c.fee_amount 
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
    `;

    conn.query(sql, [studentId], (err, result) => {
        if (err || result.length === 0) {
            console.error(err);
            return res.status(500).send("Could not fetch course fee.");
        }

        const courseFee = result[0].fee_amount;
        res.render('feeDeduction', { studentId, feeAmount: courseFee });

    });
});
// Handle Fee Payment
app.post('/pay-fee', (req, res) => {
    const { studentId, amount } = req.body;

    const studentIdNum = parseInt(studentId); // Ensure ID is a number

    console.log("💳 Fee being paid by studentId:", studentIdNum, "Amount:", amount);

    const feeSql = `INSERT INTO fees (student_id, amount, paid_at) VALUES (?, ?, NOW())`;
    conn.query(feeSql, [studentIdNum, amount], (err, result) => {
        if (err) {
            console.error("❌ Error inserting into fees table:", err);
            return res.status(500).send("❌ Fee payment failed.");
        }

        // Mark fee as paid in users table
        const updateSql = `UPDATE users SET fee_paid = 1 WHERE id = ?`;
        conn.query(updateSql, [studentIdNum], (err, updateResult) => {
            if (err) {
                console.error("❌ Error updating fee_paid:", err);
                return res.status(500).send("❌ Fee status update failed.");
            }

            if (updateResult.affectedRows === 0) {
                console.warn("⚠️ No matching student found to update fee.");
                return res.status(404).send("Student not found.");
            }

            console.log("✅ Fee paid and user updated:", studentIdNum);
            res.send("✅ Fee paid successfully. You are now fully registered and can login.");
        });
    });
});

app.get('/search', (req, res) => {
    const keyword = req.query.query;
    const query = `%${keyword}%`;
  
    const userSearch = `SELECT username, role FROM users WHERE username LIKE ?`;
    const courseSearch = `SELECT course_name, description FROM courses WHERE course_name LIKE ? OR description LIKE ?`;
  
    let results = {};
  
    conn.query(userSearch, [query], (err, userResults) => {
      if (err) return res.status(500).send("Database error on user search");
  
      results.users = userResults;
  
      conn.query(courseSearch, [query, query], (err, courseResults) => {
        if (err) return res.status(500).send("Database error on course search");
  
        results.courses = courseResults;
  
        res.render('searchResults', { results, keyword });
      });
    });
  });
  
// Gallery/About
app.get('/Gallery', (req, res) => res.render('Gallery', { title: 'Gallery' }));
app.get('/about', (req, res) => res.render('about', { title: 'About' }));

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start Server
app.listen(process.env.port || 3000);
console.log('Running at Port 3000');
