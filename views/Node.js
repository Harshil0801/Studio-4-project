const newCourse = new Course({
    name: "Bachelor of Computer Science",
    description: "Learn programming, AI, and data science.",
    teacher: "Dr. John Doe",  // Add teacher name here
    schedule: "Mon, Wed, Fri: 10:00 AM - 12:00 PM",  // Add schedule here
});

newCourse.save((err) => {
    if (err) {
        console.log("Error saving course:", err);
    } else {
        console.log("Course saved successfully");
    }
});
// Assuming you have the Course model
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Course = require('./models/Course'); // Adjust the path to your course model

// Make sure you have the correct view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route to show course details based on course ID
app.get('/course-details/:id', (req, res) => {
    const courseId = req.params.id;  // Get the course ID from the URL

    // Fetch course from the database using the ID
    Course.findById(courseId, (err, course) => {
        if (err || !course) {
            return res.status(404).send('Course not found');
        }

        // Render the course details page with the course data
        res.render('course-details', { course });
    });
});

// Your other routes go here

// Make sure to listen on a port
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
