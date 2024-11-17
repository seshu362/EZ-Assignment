const {Sequelize} = require('sequelize')
const dotenv = require('dotenv')

dotenv.config()

// Create Sequelize instance and connect to MySQL
const sequelize = new Sequelize(process.env.DB_URI, {
  dialect: 'mysql',
  logging: false, // Set to true if you want SQL queries to be logged
})

module.exports = {sequelize}
