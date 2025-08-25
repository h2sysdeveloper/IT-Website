<<<<<<< HEAD
// server.js (updated)
// -------------------------------------------------------------
// This server exposes job listings and supports job applications
// with resume upload + optional PDF text extraction.
//
// Expected MySQL tables (reference only):
//   CREATE TABLE jobs (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     title VARCHAR(255) NOT NULL,
//     location VARCHAR(255) NOT NULL,
//     type VARCHAR(100) NOT NULL,
//     description TEXT NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   );
//
//   CREATE TABLE applications (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     job_id INT NOT NULL,
//     full_name VARCHAR(255) NOT NULL,
//     email VARCHAR(255) NOT NULL,
//     phone VARCHAR(50),
//     cover_letter TEXT,
//     resume_path VARCHAR(500),
//     resume_text MEDIUMTEXT,
//     match_score INT DEFAULT 0,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
//   );
// -------------------------------------------------------------

=======
// server.js  (complete backend file)
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
const bodyParser = require('body-parser');
const express = require('express');
const mysql = require('mysql2');
<<<<<<< HEAD
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pdfParse = require('pdf-parse');

const JWT_SECRET = 'your_jwt_secret';
=======
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const util = require("util");

const JWT_SECRET = "your_jwt_secret"; // <-- change this in production
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
const app = express();
const PORT = 8081;

// --- FOLDERS ---
<<<<<<< HEAD
const uploadsDir = path.join(__dirname, 'uploads');
const resumesDir = path.join(uploadsDir, 'resumes');
=======
const uploadsDir = path.join(__dirname, "uploads");
const resumesDir = path.join(uploadsDir, "resumes");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/resumes', express.static(resumesDir));

// --- LOG REQUESTS ---
app.use((req, _res, next) => {
  console.log(`📡 [${req.method}] ${req.originalUrl}`);
  next();
});

// --- DATABASE CONNECTION ---
let db;
function handleDBConnection() {
  db = mysql.createConnection({
<<<<<<< HEAD
    host: '127.0.0.1',
    user: 'root',
    password: '123456789',
    database: 'db',
=======
    host: "127.0.0.1",
    user: "root",
    password: "123456789", // <-- set your DB password
    database: "db",        // <-- set your DB name
    multipleStatements: true,
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
  });

  db.connect((err) => {
    if (err) {
      console.error('❌ DB connection failed:', err);
      setTimeout(handleDBConnection, 2000);
    } else {
      console.log('✅ Connected to MySQL');
    }
  });

  db.on('error', (err) => {
    console.error('⚠ MySQL Error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') handleDBConnection();
  });
}
handleDBConnection();

// Promisify simple query helper
const dbQuery = (...args) => {
  return new Promise((resolve, reject) => {
    db.query(...args, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// --- MULTER CONFIG ---
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `photo-${Date.now()}${path.extname(file.originalname)}`),
});
const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumesDir),
  filename: (_req, file, cb) => cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`),
});
const uploadPhoto = multer({ storage: photoStorage });
const uploadResume = multer({ storage: resumeStorage });

// --- JWT ADMIN GUARD ---
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
<<<<<<< HEAD
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if ((decoded.role || '').toLowerCase() !== 'admin') return res.status(403).json({ error: 'Access denied' });
=======
  if (!authHeader) return res.status(401).json({ success:false, error: "No token provided" });
  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success:false, error: "Invalid token" });
    if (!decoded.role || decoded.role.toLowerCase() !== "admin") return res.status(403).json({ success:false, error: "Access denied" });
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
    req.user = decoded;
    next();
  });
}

<<<<<<< HEAD
// --- HELPERS ---
async function extractTextFromFile(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const isPdf = path.extname(filePath).toLowerCase() === '.pdf';
    if (!isPdf) return '';
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (err) {
    console.error('Error extracting resume text:', err);
    return '';
  }
}

function calculateMatchScore(resumeText, jobText) {
  const skills = ['React', 'Node.js', 'Python', 'Docker', 'CI/CD', 'JavaScript', 'MySQL', 'HTML', 'CSS', 'AWS', 'REST API', 'MongoDB', 'Java'];
  const resumeLower = (resumeText || '').toLowerCase();
  const jobLower = (jobText || '').toLowerCase();
  const matched = skills.filter((s) => resumeLower.includes(s.toLowerCase()) && jobLower.includes(s.toLowerCase()));
  return Math.round((matched.length / skills.length) * 100) || 0;
}

function daysInclusive(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s) || isNaN(e)) return 0;
  const ms = e.setHours(0, 0, 0, 0) - s.setHours(0, 0, 0, 0);
  return ms < 0 ? 0 : Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

// ---------------------- AUTH ----------------------
app.post('/api/register', uploadPhoto.single('photo'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoPath = req.file ? `uploads/${req.file.filename}` : null;
    const table = role.toLowerCase() === 'admin' ? 'admin' : 'employee1';

    db.query(`INSERT INTO ${table} (name, email, password, photo) VALUES (?, ?, ?, ?)`, [name, email, hashedPassword, photoPath], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: `${role} registered successfully` });
=======
// ------------------
// Helper placeholders
// ------------------

// Basic text extractor for resumes: reads .txt or returns empty for other types.
// Replace with proper PDF/DOCX parsing for production.
async function extractTextFromFile(filepath) {
  try {
    const ext = path.extname(filepath).toLowerCase();
    if (ext === ".txt") {
      return await fs.promises.readFile(filepath, "utf8");
    }
    // For PDFs or docx return empty string for now (placeholder)
    return "";
  } catch (err) {
    console.error("extractTextFromFile error:", err);
    return "";
  }
}

// Simple match score between resumeText and jobDescription using word overlap of skill set
function calculateMatchScore(resumeText, jobDescription) {
  if (!resumeText || !jobDescription) return 0;
  const skillSet = [
    'React', 'Node.js', 'Python', 'Docker', 'CI/CD', 'JavaScript',
    'MySQL', 'HTML', 'CSS', 'AWS', 'REST API', 'MongoDB'
  ];
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobDescription.toLowerCase();
  const jobSkills = skillSet.filter(s => jobLower.includes(s.toLowerCase()));
  if (!jobSkills.length) return 0;
  const matched = jobSkills.filter(s => resumeLower.includes(s.toLowerCase()));
  const score = Math.round((matched.length / jobSkills.length) * 100);
  return score;
}

// ------------------
// AUTH ROUTES
// ------------------

// Robust Register
app.post("/api/register", uploadPhoto.single("photo"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "All fields are required (name, email, password, role)" });
    }

    const table = role.toLowerCase() === "admin" ? "admin" : "employee1";

    // check existing
    db.query(`SELECT id FROM ${table} WHERE email = ?`, [email], async (err, rows) => {
      if (err) {
        console.error("Register: DB lookup error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      if (rows.length > 0) return res.status(409).json({ success: false, message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const photoPath = req.file ? `uploads/${req.file.filename}` : null;

      db.query(
        `INSERT INTO ${table} (name, email, password, photo) VALUES (?, ?, ?, ?)`,
        [name, email, hashedPassword, photoPath],
        (err2, result) => {
          if (err2) {
            console.error("Register: DB insert error:", err2);
            return res.status(500).json({ success: false, message: "Failed to register user" });
          }
          return res.status(201).json({
            success: true,
            message: `${role} registered successfully`,
            id: result.insertId,
            name,
            email,
            photo: photoPath ? `http://localhost:${PORT}/${photoPath}` : null
          });
        }
      );
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

<<<<<<< HEAD
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Missing fields' });

  const table = role.toLowerCase() === 'admin' ? 'admin' : 'employee1';
  db.query(`SELECT * FROM ${table} WHERE email=?`, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Login successful',
      token,
      role,
      id: user.id,
      name: user.name,
      email: user.email,
      photo: user.photo ? `http://localhost:${PORT}/${user.photo}` : null,
=======
// Robust Login
app.post("/api/login", (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Missing email or password" });

  const tryTable = (table, cb) => db.query(`SELECT * FROM ${table} WHERE email = ?`, [email], cb);

  const finalizeLogin = (userRow, roleName) => {
    const token = jwt.sign({ id: userRow.id, email: userRow.email, role: roleName }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({
      success: true,
      message: "Login successful",
      token,
      role: roleName,
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      photo: userRow.photo ? `http://localhost:${PORT}/${userRow.photo}` : null
    });
  };

  if (role) {
    const table = role.toLowerCase() === "admin" ? "admin" : "employee1";
    tryTable(table, async (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (!results.length) return res.status(401).json({ success: false, message: "Invalid credentials" });
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });
      return finalizeLogin(user, role);
    });
    return;
  }

  // try employee then admin
  tryTable("employee1", async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (results.length) {
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) return finalizeLogin(user, "Employee");
      else return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    tryTable("admin", async (err2, results2) => {
      if (err2) return res.status(500).json({ success: false, message: "Database error" });
      if (!results2.length) return res.status(401).json({ success: false, message: "Invalid credentials" });
      const user = results2[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });
      return finalizeLogin(user, "Admin");
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
    });
  });
});

<<<<<<< HEAD
// ---------------------- JOBS ----------------------
// List jobs (public)
app.get('/api/jobs', (_req, res) => {
  db.query('SELECT * FROM jobs ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
=======
// Robust Forgot Password
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email, newPassword, confirmNewPassword, role } = req.body;
    if (!email || !newPassword || !confirmNewPassword) return res.status(400).json({ success: false, message: "Email and new passwords are required" });
    if (newPassword !== confirmNewPassword) return res.status(400).json({ success: false, message: "Passwords do not match" });

    const table = role ? (role.toLowerCase() === "admin" ? "admin" : "employee1") : null;

    const findAndUpdate = (tableName) => {
      db.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (!results.length) return res.status(404).json({ success: false, message: "User not found" });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query(`UPDATE ${tableName} SET password = ? WHERE email = ?`, [hashedPassword, email], (uerr) => {
          if (uerr) return res.status(500).json({ success: false, message: "Failed to reset password" });
          return res.json({ success: true, message: "Password reset successful. Please log in with your new password." });
        });
      });
    };

    if (table) return findAndUpdate(table);

    // else search employee1 then admin
    db.query("SELECT * FROM employee1 WHERE email = ?", [email], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (rows.length) return findAndUpdate("employee1");
      db.query("SELECT * FROM admin WHERE email = ?", [email], (err2, rows2) => {
        if (err2) return res.status(500).json({ success: false, message: "Database error" });
        if (!rows2.length) return res.status(404).json({ success: false, message: "User not found" });
        return findAndUpdate("admin");
      });
    });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------
// EMPLOYEE CRUD
// ------------------
app.get("/api/employees", (req, res) => {
  db.query("SELECT * FROM employee1", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
    res.json(results);
  });
});

<<<<<<< HEAD
// Single job (public) – matches frontend GET /api/public/jobs/:id
app.get('/api/public/jobs/:id', (req, res) => {
  db.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
=======
// Add, Update, Delete employee (simple)
app.post("/api/employees", uploadPhoto.single("photo"), (req, res) => {
  const { name, department, contact, email, hire_date } = req.body;
  const photo = req.file ? `uploads/${req.file.filename}` : null;
  db.query("INSERT INTO employee1 (name, department, contact, email, hire_date, photo) VALUES (?, ?, ?, ?, ?, ?)",
    [name, department, contact, email, hire_date || null, photo],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    });
});

app.put("/api/employees/:id", uploadPhoto.single("photo"), (req, res) => {
  const id = req.params.id;
  const { name, department, contact, email, hire_date } = req.body;
  const photo = req.file ? `uploads/${req.file.filename}` : null;
  const sql = photo
    ? "UPDATE employee1 SET name=?, department=?, contact=?, email=?, hire_date=?, photo=? WHERE id=?"
    : "UPDATE employee1 SET name=?, department=?, contact=?, email=?, hire_date=? WHERE id=?";
  const params = photo ? [name, department, contact, email, hire_date || null, photo, id] : [name, department, contact, email, hire_date || null, id];
  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete("/api/employees/:id", (req, res) => {
  db.query("DELETE FROM employee1 WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ------------------
// JOBS
// ------------------
app.get("/api/jobs", (req, res) => {
  db.query("SELECT * FROM jobs ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
  });
});

// Create job (admin)
app.post('/api/jobs', verifyAdmin, (req, res) => {
  const { title, location, type, description } = req.body;
<<<<<<< HEAD
  if (!title || !location || !type || !description) return res.status(400).json({ error: 'All fields are required' });

  db.query('INSERT INTO jobs (title, location, type, description) VALUES (?, ?, ?, ?)', [title, location, type, description], (err, result) => {
    if (err) {
      console.error('DB Insert Error:', err);
      return res.status(500).json({ error: 'Failed to insert job' });
    }
    res.status(201).json({ message: 'Job created', id: result.insertId });
  });
});

// ---------------------- JOB APPLICATIONS ----------------------
//////////////////////
// 🔹 APPLICATIONS + ATS
//////////////////////
// ✅ Submit application with resume upload
=======
  if (!title || !location || !type || !description) return res.status(400).json({ error: "All fields are required" });
  db.query("INSERT INTO jobs (title, location, type, description, created_at) VALUES (?, ?, ?, ?, NOW())",
    [title, location, type, description], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to insert job" });
      res.status(201).json({ message: "Job created", id: result.insertId });
    });
});

// ------------------
// APPLICATIONS + ATS
// ------------------
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
app.post("/api/applications/upload", uploadResume.single("resume"), async (req, res) => {
  try {
    const { full_name, email, job_id } = req.body;
    if (!req.file || !full_name || !email || !job_id) return res.status(400).json({ message: "Missing required fields or resume" });

<<<<<<< HEAD
    // ✅ Fetch Job Description
    db.query("SELECT description FROM jobs WHERE id=?", [job_id], async (err, results) => {
      if (err || results.length === 0) return res.status(500).json({ message: "Job not found" });
=======
    const jobRows = await dbQuery("SELECT description FROM jobs WHERE id=?", [job_id]);
    if (!jobRows.length) return res.status(404).json({ message: "Job not found" });
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3

    const jobDescription = jobRows[0].description || "";
    const resumeText = await extractTextFromFile(req.file.path);
    const atsScore = calculateMatchScore(resumeText, jobDescription);

    await dbQuery(
      `INSERT INTO applications (full_name, email, resume_path, job_id, submitted_at, ats_score)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [full_name, email, req.file.filename, job_id, atsScore]
    );

    res.json({ message: "Application submitted", atsScore });
  } catch (error) {
    console.error("Applications upload error:", error);
    res.status(500).json({ message: "ATS processing failed", error: error.message });
  }
});


// ✅ Get Applications with Job Titles
app.get("/api/applications", (req, res) => {
  db.query(`
    SELECT a.id, a.full_name, a.email, a.resume_path, a.submitted_at, a.ats_score, a.admin_message,
           j.title AS job_title
    FROM applications a
    LEFT JOIN jobs j ON a.job_id = j.id
    ORDER BY a.submitted_at DESC
  `, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch applications" });
    res.json(results);
  });
});


// ✅ Save Admin Reply (update admin_message)
app.put("/api/applications/:id/message", (req, res) => {
  const { id } = req.params;
  const { admin_message } = req.body;

  if (!admin_message || !admin_message.trim()) {
    return res.status(400).json({ message: "Reply message cannot be empty" });
  }

  const query = "UPDATE applications SET admin_message = ? WHERE id = ?";
  db.query(query, [admin_message, id], (err, result) => {
    if (err) {
      console.error("Error updating reply:", err);
      return res.status(500).json({ message: "Database update failed" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({ message: "Reply saved successfully" });
  });
});



// ✅ Delete Application by ID
app.delete("/api/applications/:id", (req, res) => {
  const { id } = req.params;

  // First, get the resume filename (so we can delete the file too)
  db.query("SELECT resume_path FROM applications WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error while finding application" });
    if (results.length === 0) return res.status(404).json({ message: "Application not found" });

    const resumeFile = results[0].resume_path;
    const resumePath = path.join(__dirname, "uploads", "resumes", resumeFile);

    // Delete record from DB
    db.query("DELETE FROM applications WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json({ message: "DB delete error", error: err2.message });

      // Try deleting resume file (optional, won’t block response if fails)
      fs.unlink(resumePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn("⚠️ Resume file not removed:", unlinkErr.message);
        }
      });

      res.json({ message: "✅ Application deleted successfully" });
    });
  });
});
// Track application by email
app.get("/api/public/track-application", (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const query = `
    SELECT a.full_name, a.email, a.admin_message, j.title AS job_title
    FROM applications a
<<<<<<< HEAD
    JOIN jobs j ON a.job_id = j.id
    WHERE a.email = ?
=======
    LEFT JOIN jobs j ON a.job_id = j.id
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
    ORDER BY a.submitted_at DESC
    LIMIT 1
  `;

<<<<<<< HEAD
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No application found for this email" });
    }

    res.json(results[0]); // return the latest application
  });
});


// ---------------------- EMPLOYEES ----------------------
app.get('/api/employees', (_req, res) => {
  db.query('SELECT * FROM employee1 ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


// ---------------------- LEAVE APPLICATIONS ----------------------
app.post('/api/leave-applications', (req, res) => {
  const { employeeId, leaveType, startDate, endDate } = req.body;
  if (!employeeId || !leaveType || !startDate || !endDate) return res.status(400).json({ error: 'All fields are required' });
  if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ error: 'End date cannot be before start date' });

  const checkEmpSql = 'SELECT 1 FROM employee1 WHERE id = ? LIMIT 1';
  db.query(checkEmpSql, [employeeId], (chkErr, chkRows) => {
    if (chkErr) return res.status(500).json({ error: chkErr.message });
    if (chkRows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    const query = `INSERT INTO leave_applications (employee_id, leaveType, startDate, endDate, status) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [employeeId, leaveType, startDate, endDate, 'Pending'], (err) => {
      if (err) {
        console.error('Error inserting leave request:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      res.status(200).json({ message: 'Leave request submitted successfully' });
    });
  });
});

app.get('/api/leave/employee/:id', (req, res) => {
  const sql = `SELECT id, leaveType, startDate, endDate, status FROM leave_applications WHERE employee_id = ? ORDER BY id DESC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
=======
app.put("/api/applications/:id/message", (req, res) => {
  const { admin_message } = req.body;
  db.query("UPDATE applications SET admin_message = ? WHERE id = ?", [admin_message, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Failed to save message" });
    res.json({ message: "Message saved" });
  });
});

// ------------------
// FACE DESCRIPTOR + ATTENDANCE
// ------------------

// Helper: load all descriptors from DB
function loadAllDescriptorsFromDB() {
  return new Promise((resolve, reject) => {
    db.query("SELECT employee_id, descriptor_json FROM face_descriptors", (err, results) => {
      if (err) return reject(err);
      const map = {};
      results.forEach(r => {
        try {
          const arr = JSON.parse(r.descriptor_json);
          if (!map[r.employee_id]) map[r.employee_id] = [];
          if (Array.isArray(arr[0])) map[r.employee_id].push(...arr);
          else map[r.employee_id].push(arr);
        } catch (e) {
          console.warn("Invalid descriptor JSON for employee:", r.employee_id);
        }
      });
      resolve(map);
    });
  });
}

// Euclidean distance (128-d vector expected)
function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Enroll face descriptor (admin or employee enroll)
app.post("/api/enroll-face", (req, res) => {
  const { employeeId, descriptor } = req.body;
  if (!employeeId || !descriptor || !Array.isArray(descriptor)) {
    return res.status(400).json({ error: "employeeId and descriptor array required" });
  }
  const descriptorJson = JSON.stringify(descriptor);
  db.query("INSERT INTO face_descriptors (employee_id, descriptor_json) VALUES (?, ?)", [employeeId, descriptorJson], (err, result) => {
    if (err) {
      console.error("Enroll error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Face descriptor saved", id: result.insertId });
  });
});

// Attendance mark & match
app.post("/api/attendance/mark", async (req, res) => {
  try {
    const { descriptor, imageBase64 } = req.body;
    if (!descriptor || !Array.isArray(descriptor)) return res.status(400).json({ matched: false, message: "descriptor required" });

    const all = await loadAllDescriptorsFromDB();
    let best = { employee_id: null, distance: Infinity };

    for (const empId of Object.keys(all)) {
      const descriptors = all[empId];
      for (const d of descriptors) {
        const dist = euclidean(descriptor, d);
        if (dist < best.distance) best = { employee_id: empId, distance: dist };
      }
    }

    const THRESHOLD = 0.6;
    if (!best.employee_id || best.distance > THRESHOLD) {
      return res.json({ matched: false, message: "No match (distance " + best.distance.toFixed(3) + ")" });
    }

    const matchedEmployeeId = best.employee_id;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const morningStart = 10 * 60 + 30; // 10:30
    const morningEnd = 11 * 60 + 0;    // 11:00
    const eveningStart = 18 * 60 + 0;  // 18:00
    const eveningEnd = 18 * 60 + 30;   // 18:30

    function saveImageIfProvided(cb) {
      if (!imageBase64) return cb(null, null);
      const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      const b64 = matches ? matches[2] : imageBase64;
      const ext = matches ? matches[1].split("/")[1] : "jpg";
      const filename = `attendance-${matchedEmployeeId}-${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFile(filepath, Buffer.from(b64, "base64"), (err2) => {
        if (err2) return cb(err2);
        const publicPath = `uploads/${filename}`;
        cb(null, publicPath);
      });
    }

    // find today's attendance
    db.query("SELECT * FROM attendance WHERE employee_id = ? AND date = ?", [matchedEmployeeId, todayStr], (err, rows) => {
      if (err) return res.status(500).json({ matched: true, message: "DB error", error: err.message });

      const row = rows.length ? rows[0] : null;

      // morning
      if (currentMinutes >= morningStart && currentMinutes <= morningEnd) {
        if (!row) {
          saveImageIfProvided((imgErr, imgPath) => {
            if (imgErr) console.error("Image save error:", imgErr);
            const insertSql = "INSERT INTO attendance (employee_id, date, status, check_in, photo) VALUES (?, ?, ?, ?, ?)";
            db.query(insertSql, [matchedEmployeeId, todayStr, 'Present', now.toTimeString().split(" ")[0], imgPath], (err2) => {
              if (err2) return res.status(500).json({ matched: true, message: err2.message });
              return res.json({ matched: true, employee_id: matchedEmployeeId, slot: "morning", result: "checked_in", message: "Morning check-in recorded (half-day until evening check)" });
            });
          });
        } else {
          if (row.check_in) return res.json({ matched: true, employee_id: matchedEmployeeId, message: "Morning already recorded" });
          saveImageIfProvided((imgErr, imgPath) => {
            const upd = "UPDATE attendance SET check_in = ?, photo = ? WHERE id = ?";
            db.query(upd, [now.toTimeString().split(" ")[0], imgPath, row.id], (err3) => {
              if (err3) return res.status(500).json({ matched: true, message: err3.message });
              return res.json({ matched: true, employee_id: matchedEmployeeId, slot: "morning", result: "check_in_updated", message: "Morning check-in recorded" });
            });
          });
        }
        return;
      }

      // evening
      if (currentMinutes >= eveningStart && currentMinutes <= eveningEnd) {
        if (!row) {
          saveImageIfProvided((imgErr, imgPath) => {
            if (imgErr) console.error("Image save error:", imgErr);
            const insertSql = "INSERT INTO attendance (employee_id, date, status, check_out, photo) VALUES (?, ?, ?, ?, ?)";
            db.query(insertSql, [matchedEmployeeId, todayStr, 'Present', now.toTimeString().split(" ")[0], imgPath], (err2) => {
              if (err2) return res.status(500).json({ matched: true, message: err2.message });
              return res.json({ matched: true, employee_id: matchedEmployeeId, slot: "evening", result: "checked_out_only", message: "Evening check-out recorded (half-day since no morning check-in)" });
            });
          });
        } else {
          if (row.check_out) return res.json({ matched: true, employee_id: matchedEmployeeId, message: "Evening already recorded" });
          saveImageIfProvided((imgErr, imgPath) => {
            const upd = "UPDATE attendance SET check_out = ?, photo = ? WHERE id = ?";
            db.query(upd, [now.toTimeString().split(" ")[0], imgPath, row.id], (err4) => {
              if (err4) return res.status(500).json({ matched: true, message: err4.message });

              const isFull = !!row.check_in;
              const respMsg = isFull ? "Full day recorded (check-in + check-out)" : "Check-out recorded; only one slot present -> Half day";
              db.query("UPDATE attendance SET status = ? WHERE id = ?", ['Present', row.id], (err5) => {
                if (err5) console.warn("Could not update status column:", err5.message);
                return res.json({ matched: true, employee_id: matchedEmployeeId, slot: "evening", result: isFull ? "full_day" : "half_day", message: respMsg });
              });
            });
          });
        }
        return;
      }

      // not in window
      return res.json({ matched: true, employee_id: matchedEmployeeId, message: "Not in attendance window. Morning 10:30-11:00 and Evening 18:00-18:30" });
    });
  } catch (err) {
    console.error("Attendance mark error:", err);
    res.status(500).json({ matched: false, message: err.message });
  }
});

// ------------------
// LEAVE APPLICATIONS
// ------------------
app.get("/api/leave-approval/pending-count", (req, res) => {
  const sql = "SELECT COUNT(*) AS count FROM leave_applications WHERE status = 'Pending'";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ count: results[0].count });
  });
});

app.post("/api/leave-applications", (req, res) => {
  const { employeeId, leaveType, startDate, endDate } = req.body;
  if (!employeeId || !leaveType || !startDate || !endDate) return res.status(400).json({ message: "All fields are required" });

  db.query("SELECT name FROM employee1 WHERE id = ?", [employeeId], (err, empResults) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!empResults.length) return res.status(404).json({ message: "Employee not found" });

    const employeeName = empResults[0].name;
    db.query(`INSERT INTO leave_applications (employee_id, employeeName, leaveType, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [employeeId, employeeName, leaveType, startDate, endDate], (err2, result) => {
        if (err2) return res.status(500).json({ message: "Failed to submit leave request", error: err2 });
        res.json({ message: "Leave request submitted", id: result.insertId });
      });
  });
});

app.get("/api/leave-approval", (req, res) => {
  db.query("SELECT * FROM leave_applications ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get("/api/leave-applications/employee/:id", (req, res) => {
  db.query("SELECT * FROM leave_applications WHERE employee_id = ? ORDER BY id DESC", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3
    res.json(results);
  });
});

<<<<<<< HEAD
app.get('/api/leave-approval', (_req, res) => {
  const sql = `
    SELECT 
      la.id,
      la.employee_id,
      COALESCE(e.name, '') AS employeeName,
      la.leaveType,
      la.startDate,
      la.endDate,
      la.status,
      e.available_leaves
    FROM leave_applications la
    LEFT JOIN employee1 e ON la.employee_id = e.id
    ORDER BY la.id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.put('/api/leave-applications/:id/status', (req, res) => {
  const { status } = req.body;
  const leaveId = req.params.id;
  if (!status) return res.status(400).json({ message: 'Status is required' });

  const getSql = 'SELECT employee_id, startDate, endDate, status FROM leave_applications WHERE id = ?';
  db.query(getSql, [leaveId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Lookup error', error: err.message });
    if (rows.length === 0) return res.status(404).json({ message: 'Leave application not found' });

    const appRow = rows[0];
    if (appRow.status === status) return res.json({ message: `Leave already ${status}` });

    const updateLeaveSql = 'UPDATE leave_applications SET status = ? WHERE id = ?';
    db.query(updateLeaveSql, [status, leaveId], (err2) => {
      if (err2) return res.status(500).json({ message: 'Failed to update status', error: err2.message });

      if (status === 'Approved') {
        const days = daysInclusive(appRow.startDate, appRow.endDate);
        const deductSql = 'UPDATE employee1 SET available_leaves = GREATEST(available_leaves - ?, 0) WHERE id = ?';
        db.query(deductSql, [days, appRow.employee_id], (err3) => {
          if (err3) return res.json({ message: 'Leave Approved, but failed to deduct leaves', error: err3.message });
          return res.json({ message: `Leave Approved (${days} day${days !== 1 ? 's' : ''} deducted)` });
        });
      } else {
        return res.json({ message: `Leave ${status}` });
      }
    });
  });
});

app.delete('/api/leave-applications/:id', (req, res) => {
  db.query('DELETE FROM leave_applications WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Leave request deleted' });
  });
});

// ---------------------- ROOT ----------------------
app.get('/', (_req, res) => res.send('API is running ✅'));
=======
app.put("/api/leave-applications/:id/status", (req, res) => {
  const { status } = req.body;
  db.query("UPDATE leave_applications SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Leave ${status}` });
  });
});

app.delete("/api/leave-applications/:id", (req, res) => {
  db.query("DELETE FROM leave_applications WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Leave request deleted" });
  });
});

// ------------------
// MULTI-JOB ATS SCAN REPORT
// ------------------
app.get("/api/reports/multi-job-scan", async (req, res) => {
  try {
    const applications = await dbQuery("SELECT * FROM applications");
    const jobs = await dbQuery("SELECT * FROM jobs");

    const results = [];
    for (const appData of applications) {
      let resumeText = "";
      const resumePath = path.join(resumesDir, appData.resume_path || "");
      try {
        resumeText = await extractTextFromFile(resumePath);
      } catch (err) {
        console.error(`Error reading resume for ${appData.full_name}:`, err.message);
      }
      for (const job of jobs) {
        const { score, matchedSkills } = (() => {
          const score = calculateMatchScore(resumeText, job.description || "");
          // For compatibility with earlier code structure
          const matchedSkills = [];
          return { score, matchedSkills };
        })();
        results.push({
          full_name: appData.full_name,
          email: appData.email,
          resume_path: appData.resume_path,
          submitted_at: appData.submitted_at,
          job_title: job.title,
          job_id: job.id,
          ats_score: score,
          matched_skills: "" // placeholder
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Error generating ATS scan report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
>>>>>>> 822b62c1d4df5f69e784b4ff951a93344b610ca3

// ------------------
// START SERVER
// ------------------
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
