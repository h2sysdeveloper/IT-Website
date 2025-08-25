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

const bodyParser = require('body-parser');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pdfParse = require('pdf-parse');

const JWT_SECRET = 'your_jwt_secret';
const app = express();
const PORT = 8081;

// --- FOLDERS ---
const uploadsDir = path.join(__dirname, 'uploads');
const resumesDir = path.join(uploadsDir, 'resumes');
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
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
    host: '127.0.0.1',
    user: 'root',
    password: '123456789',
    database: 'db',
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
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if ((decoded.role || '').toLowerCase() !== 'admin') return res.status(403).json({ error: 'Access denied' });
    req.user = decoded;
    next();
  });
}

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
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    });
  });
});

// ---------------------- JOBS ----------------------
// List jobs (public)
app.get('/api/jobs', (_req, res) => {
  db.query('SELECT * FROM jobs ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Single job (public) – matches frontend GET /api/public/jobs/:id
app.get('/api/public/jobs/:id', (req, res) => {
  db.query('SELECT * FROM jobs WHERE id = ? LIMIT 1', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  });
});

// Create job (admin)
app.post('/api/jobs', verifyAdmin, (req, res) => {
  const { title, location, type, description } = req.body;
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
app.post("/api/applications/upload", uploadResume.single("resume"), async (req, res) => {
  try {
    const { full_name, email, job_id } = req.body;
    if (!req.file || !full_name || !email || !job_id)
      return res.status(400).json({ message: "Missing required fields or resume" });

    // ✅ Fetch Job Description
    db.query("SELECT description FROM jobs WHERE id=?", [job_id], async (err, results) => {
      if (err || results.length === 0) return res.status(500).json({ message: "Job not found" });

      const jobDescription = results[0].description;
      const resumeText = await extractTextFromFile(req.file.path);
      const atsScore = calculateMatchScore(resumeText, jobDescription);

      db.query(
        `INSERT INTO applications (full_name, email, resume_path, job_id, submitted_at, ats_score)
         VALUES (?, ?, ?, ?, NOW(), ?)`,
        [full_name, email, req.file.filename, job_id, atsScore],
        err2 => {
          if (err2) return res.status(500).json({ message: "DB Insert Error", error: err2.message });
          res.json({ message: "Application submitted", atsScore });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "ATS processing failed", error: error.message });
  }
});


// ✅ Get Applications with Job Titles
app.get("/api/applications", (req, res) => {
  db.query(`
    SELECT a.id, a.full_name, a.email, a.resume_path, a.submitted_at, a.ats_score, a.admin_message,
           j.title AS job_title
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
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
    JOIN jobs j ON a.job_id = j.id
    WHERE a.email = ?
    ORDER BY a.submitted_at DESC
    LIMIT 1
  `;

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
    res.json(results);
  });
});

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

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
