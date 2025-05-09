const app = require('./app');
const { sequelize } = require('./models');
const PORT = process.env.PORT || 5000;

// Test database connection and sync models
sequelize.authenticate()
  .then(() => {
    console.log('Connected to MySQL database');
    return sequelize.sync({ alter: true }); // Use { force: true } to drop and recreate tables
  })
  .then(() => {
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  }); 