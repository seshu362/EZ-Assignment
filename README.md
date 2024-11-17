# File Sharing App

This is a simple **File Sharing App** built with **Express.js** and **SQLite** that allows users to upload and download files. The app implements role-based authentication and provides a way for users to manage their files.

## Features

- **User Registration**: Register as either an Ops User or Client User.
- **User Login**: Log in using a username and password.
- **File Upload**: Ops Users can upload files.
- **File Listing**: Client Users can view the files they uploaded.
- **File Download**: Generate a download link for the files you uploaded.
  
## Technologies Used

- **Express.js** for building the backend server.
- **SQLite** as the database.
- **Bcrypt** for password hashing.
- **JWT (JSON Web Tokens)** for user authentication.
- **Multer** for handling file uploads.
  
## Installation

1. Install the dependencies:
```bash
   npm install
```
2. Create the SQLite database (fileSharingApp.db) and tables:
The tables will be automatically created when you run the server. However, you can initialize the database by running:
```
node app.js
```

3. The app will be running on http://localhost:3000.

