const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const fs = require('fs')
const app = express()
const PORT = 3000

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

let database = null

// Initialize the database and server
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, 'fileSharingApp.db'),
      driver: sqlite3.Database,
    })

    await createTables()

    await database.run(`
      INSERT INTO roles (name) VALUES ('Ops User'), ('Client User');
    `)

    app.listen(PORT, () => {
      console.log(`Server Running at http://localhost:${PORT}/`)
    })
  } catch (error) {
    console.error(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

const createTables = async () => {
  await database.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS roles;

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      roleId INTEGER NOT NULL,
      FOREIGN KEY (roleId) REFERENCES roles (id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      date_uploaded TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users (id)
    );
  `)
}

// Middleware for JWT authentication and role-based authorization
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    jwt.verify(token, 'your_secret_key', (err, user) => {
      if (err) {
        return res.sendStatus(403)
      }
      req.user = user
      next()
    })
  } else {
    res.sendStatus(401)
  }
}

// User registration endpoint
app.post('/register', async (req, res) => {
  const {username, password, roleName} = req.body
  const hashedPassword = await bcrypt.hash(password, 10)

  const role = await database.get('SELECT id FROM roles WHERE name = ?', [
    roleName,
  ])

  if (!role) {
    return res.status(400).json({error: 'Invalid role name'})
  }

  try {
    await database.run(
      `INSERT INTO users (username, password, roleId) VALUES (?, ?, ?)`,
      [username, hashedPassword, role.id],
    )
    res.status(201).json({message: 'User registered successfully'})
  } catch (error) {
    res.status(500).json({error: error.message})
  }
})

// User login endpoint
app.post('/login', async (req, res) => {
  const {username, password} = req.body
  const sql = `SELECT * FROM users WHERE username = ?`

  try {
    const user = await database.get(sql, [username])
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {userId: user.id, roleId: user.roleId},
        'your_secret_key',
      )
      res.json({token})
    } else {
      res.status(401).json({message: 'Invalid username or password'})
    }
  } catch (error) {
    res.status(500).json({error: error.message})
  }
})

// File upload logic using multer (for Ops User only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = `uploads/${req.user.userId}`
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, {recursive: true})
    }
    cb(null, userDir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`)
  },
})
const upload = multer({storage})

app.post('/upload', authenticateJWT, upload.single('file'), (req, res) => {
  if (req.user.roleId !== 1) {
    return res.status(403).json({error: 'Permission denied'})
  }

  const sql = `INSERT INTO files (userId, filename, filepath, date_uploaded) VALUES (?, ?, ?, ?)`

  try {
    const result = database.run(sql, [
      req.user.userId,
      req.file.originalname,
      req.file.path,
      new Date().toISOString(),
    ])
    res
      .status(201)
      .json({message: 'File uploaded successfully', fileId: result.lastID})
  } catch (error) {
    res.status(500).json({error: error.message})
  }
})

// Get all files for a specific user (for Client User)
app.get('/files', authenticateJWT, async (req, res) => {
  if (req.user.roleId !== 2) {
    return res.status(403).json({error: 'Permission denied'})
  }

  const sql = `SELECT * FROM files WHERE userId = ?`
  try {
    const files = await database.all(sql, [req.user.userId])
    res.json(files)
  } catch (error) {
    res.status(500).json({error: error.message})
  }
})

// Generate download link for a file
app.get('/download/:fileId', authenticateJWT, async (req, res) => {
  const {fileId} = req.params

  const sql = `SELECT * FROM files WHERE id = ? AND userId = ?`
  try {
    const file = await database.get(sql, [fileId, req.user.userId])
    if (file) {
      const encryptedToken = Buffer.from(file.id.toString()).toString('base64')
      res.json({
        message: 'Download link generated successfully',
        downloadLink: `http://localhost:3000/download/${encryptedToken}`,
      })
    } else {
      res.status(404).json({error: 'File not found'})
    }
  } catch (error) {
    res.status(500).json({error: error.message})
  }
})

// Actual file download via encrypted link
app.get('/download/:encryptedToken', authenticateJWT, (req, res) => {
  const {encryptedToken} = req.params
  const fileId = Buffer.from(encryptedToken, 'base64').toString('utf-8')

  const sql = `SELECT * FROM files WHERE id = ?`
  database.get(sql, [fileId], (err, file) => {
    if (file) {
      res.download(file.filepath, file.filename)
    } else {
      res.status(404).json({error: 'File not found'})
    }
  })
})

// Initialize the app
initializeDbAndServer()
