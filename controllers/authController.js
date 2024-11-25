const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {User} = require('../models') // Import User model

// Register User
exports.registerUser = async (req, res) => {
  try {
    const {username, email, password} = req.body

    // Check if user already exists
    const existingUser = await User.findOne({where: {email}})
    if (existingUser) {
      return res.status(400).json({message: 'User already exists'})
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const user = await User.create({username, email, password: hashedPassword})

    res.status(201).json({message: 'User registered successfully', user})
  } catch (error) {
    res.status(500).json({message: 'Error registering user', error})
  }
}

// Login User
exports.loginUser = async (req, res) => {
  try {
    const {email, password} = req.body

    // Find the user by email
    const user = await User.findOne({where: {email}})
    if (!user) {
      return res.status(400).json({message: 'User not found'})
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({message: 'Invalid credentials'})
    }

    // Generate JWT token
    const token = jwt.sign({userId: user.id}, process.env.JWT_SECRET, {
      expiresIn: '1h',
    })

    res.status(200).json({message: 'Login successful', token})
  } catch (error) {
    res.status(500).json({message: 'Error logging in', error})
  }
}
