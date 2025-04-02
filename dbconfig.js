// Import the MySQL module
var mysql = require('mysql');

// Create a connection to the MySQL database
var conn = mysql.createConnection({
	host: 'localhost', // Database host
	user: 'root',      // Database user
	password: 'mysql',      // Database password
	database: 'ramandb' // Database name
}); 

// Connect to the database
conn.connect(function(err) {
	if (err) throw err; // Throw error if connection fails
	console.log('Database connected'); // Log message if connection successful
});

// Export the connection module to be used in other files
module.exports = conn;

