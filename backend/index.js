const bodyParser = require('body-parser');
const express = require("express");
const mysql = require('mysql2');
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");


const JWT_SECRET = "your_jwt_secret";
const app = express();
const PORT = 8081;

// --- FOLDERS ---
const uploadsDir = path.join(__dirname, "uploads");
const resumesDir = path.join(uploadsDir, "resumes");
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));
app.use("/uploads/resumes", express.static(resumesDir));

// --- LOG REQUESTS ---
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.originalUrl}`);
  next();
});

// --- DATABASE CONNECTION ---
let db;
function handleDBConnection() {
  db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "123456789",
    database: "db",
  });

  db.connect(err => {
    if (err) {
      console.error("❌ DB connection failed:", err);
      setTimeout(handleDBConnection, 2000);
    } else {
      console.log("✅ Connected to MySQL");
    }
  });

  db.on("error", err => {
    console.error("⚠ MySQL Error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") handleDBConnection();
  });
}
handleDBConnection();

// --- MULTER CONFIG ---
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `photo-${Date.now()}${path.extname(file.originalname)}`)
});
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumesDir),
  filename: (req, file, cb) => cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`)
});
const uploadPhoto = multer({ storage: photoStorage });
const uploadResume = multer({ storage: resumeStorage });
const uploadEmployeePhoto = multer({ storage: photoStorage });

// --- JWT ADMIN GUARD ---
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    if (decoded.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Access denied" });
    req.user = decoded;
    next();
  });
}

//////////////////////
// 🔹 AUTH ROUTES
//////////////////////
app.post("/api/register", uploadPhoto.single("photo"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "All fields are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoPath = req.file ? `uploads/${req.file.filename}` : null;
    const table = role.toLowerCase() === "admin" ? "admin" : "employee1";

    db.query(`INSERT INTO ${table} (name, email, password, photo) VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, photoPath],
      err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `${role} registered successfully` });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: "Missing fields" });

  const table = role.toLowerCase() === "admin" ? "admin" : "employee1";
  db.query(`SELECT * FROM ${table} WHERE email=?`, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      message: "Login successful",
      token,
      role,
      id: user.id,                  // ✅ IMPORTANT: send id
      name: user.name,
      email: user.email,
      photo: user.photo ? `http://localhost:8081/${user.photo}` : null
    });
  });
});


//////////////////////
// 🔹 EMPLOYEE CRUD
//////////////////////
app.get("/api/employees", (req, res) => {
  db.query("SELECT * FROM employee1", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//////////////////////
// 🔹 JOBS
//////////////////////
app.get("/api/jobs", (req, res) => {
  db.query("SELECT * FROM jobs ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

app.post("/api/jobs", verifyAdmin, (req, res) => {
  const { title, location, type, description } = req.body;
  if (!title || !location || !type || !description) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.query(
    "INSERT INTO jobs (title, location, type, description) VALUES (?, ?, ?, ?)",
    [title, location, type, description],
    (err, result) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ error: "Failed to insert job" });
      }
      res.status(201).json({ message: "Job created", id: result.insertId });
    }
  );
});

//////////////////////
// 🔹 APPLICATIONS + ATS
//////////////////////
app.post("/api/applications/upload", uploadResume.single("resume"), async (req, res) => {
  try {
    const { full_name, email, job_id } = req.body;
    if (!req.file || !full_name || !email || !job_id)
      return res.status(400).json({ message: "Missing required fields or resume" });

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

app.get("/api/applications", (req, res) => {
  db.query(`
    SELECT a.id, a.full_name, a.email, a.resume_path, a.submitted_at, a.ats_score,
           j.title AS job_title
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    ORDER BY a.submitted_at DESC
  `, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch applications" });
    res.json(results);
  });
});

app.get("/api/applications/scanned", (req, res) => {
  db.query(`
    SELECT a.id, a.full_name, a.email, a.resume_path, a.job_id, a.ats_score, a.submitted_at,
           j.title AS job_title
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    ORDER BY a.submitted_at DESC
  `, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch scanned resumes" });
    res.json(results);
  });
});

//////////////////////
// 🔹 FORGOT PASSWORD
//////////////////////
app.post("/api/forgot-password", async (req, res) => {
  const { email, newPassword, confirmNewPassword, role } = req.body;
  if (!email || !newPassword || !confirmNewPassword || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const table = role.toLowerCase() === "admin" ? "admin" : "employee1";

  try {
    db.query(`SELECT * FROM ${table} WHERE email=?`, [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0) return res.status(404).json({ message: "User not found" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query(`UPDATE ${table} SET password=? WHERE email=?`, [hashedPassword, email], (err2) => {
        if (err2) return res.status(500).json({ message: "Failed to reset password" });
        res.json({ message: "Password reset successful. Please log in with your new password." });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//////////////////////
// 🔹 LEAVE APPLICATIONS
//////////////////////

app.get("/api/leave-approval/pending-count", (req, res) => {
  const sql = "SELECT COUNT(*) AS count FROM leave_applications WHERE status = 'Pending'";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching pending count:", err);
      return res.status(500).json({ error: err });
    }
    res.json({ count: results[0].count });
  });
});


app.post("/api/leave-applications", (req, res) => {
  const { employeeId, leaveType, startDate, endDate } = req.body;
  console.log("📥 Incoming leave request:", req.body);
  if (!employeeId || !leaveType || !startDate || !endDate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const getEmpSql = "SELECT name FROM employee1 WHERE id = ?";
  db.query(getEmpSql, [employeeId], (err, empResults) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (empResults.length === 0) return res.status(404).json({ message: "Employee not found" });

    const employeeName = empResults[0].name;
    const insertSql = `
      INSERT INTO leave_applications (employee_id, employeeName, leaveType, startDate, endDate, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `;
    db.query(insertSql, [employeeId, employeeName, leaveType, startDate, endDate], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Failed to submit leave request", error: err2 });
      res.json({ message: "✅ Leave request submitted and waiting admin approval", id: result.insertId });
    });
  });
});

// Admin: Get all leave applications
app.get("/api/leave-approval", (req, res) => {
  const sql = `SELECT * FROM leave_applications ORDER BY id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Employee: Get own leave applications
app.get("/api/leave-applications/employee/:id", (req, res) => {
  const sql = `SELECT * FROM leave_applications WHERE employee_id = ? ORDER BY id DESC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Admin updates status
app.put("/api/leave-applications/:id/status", (req, res) => {
  const { status } = req.body;
  const sql = `UPDATE leave_applications SET status = ? WHERE id = ?`;
  db.query(sql, [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Leave ${status}` });
  });
});

// Admin delete leave application
app.delete("/api/leave-applications/:id", (req, res) => {
  const sql = `DELETE FROM leave_applications WHERE id = ?`;
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Leave request deleted" });
  });
});

//////////////////////
// 🔹 MULTI-JOB ATS SCAN
//////////////////////
function compareResumeToJob(resumeText, jobText) {
  const skillSet = [
    'React', 'Node.js', 'Python', 'Docker', 'CI/CD', 'JavaScript',
    'MySQL', 'HTML', 'CSS', 'AWS', 'REST API', 'MongoDB'
  ];
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobText.toLowerCase();
  const resumeSkills = skillSet.filter(skill => resumeLower.includes(skill.toLowerCase()));
  const jobSkills = skillSet.filter(skill => jobLower.includes(skill.toLowerCase()));
  const matchedSkills = jobSkills.filter(skill => resumeSkills.includes(skill));
  const score = Math.round((matchedSkills.length / jobSkills.length) * 100) || 0;
  return { score, matchedSkills };
}

app.get("/api/reports/multi-job-scan", async (req, res) => {
  try {
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

    const applications = await query("SELECT * FROM applications");
    const jobs = await query("SELECT * FROM jobs");

    const results = [];

    for (const appData of applications) {
      let resumeText = "";
      const resumePath = path.join(resumesDir, appData.resume_path);
      try {
        resumeText = await extractTextFromFile(resumePath);
      } catch (err) {
        console.error(`Error reading resume for ${appData.full_name}:`, err.message);
      }

      for (const job of jobs) {
        const { score, matchedSkills } = compareResumeToJob(resumeText, job.description);
        results.push({
          full_name: appData.full_name,
          email: appData.email,
          resume_path: appData.resume_path,
          submitted_at: appData.submitted_at,
          job_title: job.title,
          job_id: job.id,
          ats_score: score,
          matched_skills: matchedSkills.join(", ")
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Error generating ATS scan report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
