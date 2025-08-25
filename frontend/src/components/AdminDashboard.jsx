import React, { useEffect, useState } from "react";
import axios from "axios";
import ManageJobs from './ManageJobs';
import ATSScanner from "./ATSScanner";
import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [applications, setApplications] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [form, setForm] = useState({ name: "", department: "", contact: "", email: "", hire_date: "", available_leaves: 20 });
  const [file, setFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loggedInAdmin, setLoggedInAdmin] = useState(null);
  const [view, setView] = useState("employees");
  const [leaveApproval, setLeaveApproval] = useState([]);
  const [employeeReviews] = useState([]);
  const [reports] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setLoggedInAdmin(user);
      if (user.role !== "Admin") {
        alert("Access denied: Admins only.");
        window.location.href = "/";
        return;
      }
    } else {
      window.location.href = "/";
      return;
    }

    fetchEmployees();
    fetchApplications();
    fetchLeaveApproval();
    fetchPendingLeaveCount();

    const interval = setInterval(fetchPendingLeaveCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:8081/api/employees");
      setEmployees(res.data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get("http://localhost:8081/api/applications");
      setApplications(res.data);
      const drafts = {};
      res.data.forEach(app => {
        drafts[app.id] = app.admin_message || "";
      });
      setReplyDrafts(drafts);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    }
  };

  const fetchLeaveApproval = async () => {
    try {
      const res = await axios.get("http://localhost:8081/api/leave-approval");
      setLeaveApproval(res.data);
    } catch (err) {
      console.error("Failed to fetch leave approvals:", err);
    }
  };

  const fetchPendingLeaveCount = async () => {
    try {
      const res = await axios.get("http://localhost:8081/api/leave-approval/pending-count");
      setPendingLeaveCount(res.data.count);
    } catch (err) {
      console.error("Failed to fetch pending leave count", err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "/login";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (file) formData.append("photo", file);

    const url = editId
      ? `http://localhost:8081/api/employees/${editId}`
      : "http://localhost:8081/api/employees";
    const method = editId ? "put" : "post";

    try {
      await axios({ method, url, data: formData, headers: { "Content-Type": "multipart/form-data" } });
      fetchEmployees();
      setForm({ name: "", department: "", contact: "", email: "", hire_date: "", available_leaves: 20 });
      setFile(null);
      setEditId(null);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEdit = (emp) => {
    setEditId(emp.id);
    setForm({
      name: emp.name,
      department: emp.department,
      contact: emp.contact,
      email: emp.email,
      hire_date: emp.hire_date ? emp.hire_date.split("T")[0] : "",
      available_leaves: emp.available_leaves || 20
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await axios.delete(`http://localhost:8081/api/employees/${id}`);
        fetchEmployees();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleReplyChange = (id, message) => {
    setReplyDrafts(prev => ({ ...prev, [id]: message }));
  };

const handleReplySave = async (id) => {
  const message = replyDrafts[id];
  if (!message || !message.trim()) {
    alert("Reply cannot be empty.");
    return;
  }
  try {
    await axios.put(`http://localhost:8081/api/applications/${id}/message`, { admin_message: message });
    alert("Reply saved.");
  } catch (err) {
    console.error("Reply save failed:", err);
    alert("Failed to save reply.");
  }
};
  // ✅ Updated: handleApprove deducts available leaves
  const handleApprove = async (leaveId) => {
    try {
      await axios.put(`http://localhost:8081/api/leave-applications/${leaveId}/status`, { status: "Approved" });
      fetchLeaveApproval();
      fetchPendingLeaveCount();
      fetchEmployees(); // refresh employees to show updated available leaves
    } catch (err) {
      console.error("Approval failed", err);
      alert("Failed to approve leave!");
    }
  };

  const handleReject = async (leaveId) => {
    try {
      await axios.put(`http://localhost:8081/api/leave-applications/${leaveId}/status`, { status: "Rejected" });
      fetchLeaveApproval();
      fetchPendingLeaveCount();
    } catch (err) {
      console.error("Rejection failed", err);
      alert("Failed to reject leave!");
    }
  };

  const filtered = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    switch (view) {
      case "jobs":
        return <ManageJobs />;
      case "applications":
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th><th>Applicant</th><th>Email</th><th>Job Title</th><th>Resume</th>
                <th>ATS Score</th><th>Submitted At</th><th>Reply</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td>{app.id}</td>
                  <td>{app.full_name}</td>
                  <td>{app.email}</td>
                  <td>{app.job_title}</td>
                  <td>{app.resume_path ? <a href={`http://localhost:8081/uploads/resumes/${app.resume_path}`} target="_blank" rel="noreferrer">View</a> : "—"}</td>
                  <td>{app.ats_score}</td>
                  <td>{new Date(app.submitted_at).toLocaleString()}</td>
                  <td>
                    <textarea value={replyDrafts[app.id] || ""} onChange={(e) => handleReplyChange(app.id, e.target.value)} rows={3} />
                  </td>
                  <td><button onClick={() => handleReplySave(app.id)}>💾 Save</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "ats-scanner":
        return <ATSScanner />;
      case "employees":
        return (
          <>
            <div className="admin-actions-bar">
              <button className="action-button">Add Employee</button>
            </div>
            <form onSubmit={handleSubmit} className="employee-form" encType="multipart/form-data">
              <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
              <input name="department" value={form.department} onChange={handleChange} placeholder="Department" required />
              <input name="contact" value={form.contact} onChange={handleChange} placeholder="Contact" />
              <input name="email" value={form.email} onChange={handleChange} placeholder="Email" required />
              <input type="date" name="hire_date" value={form.hire_date} onChange={handleChange} />
              <input type="number" name="available_leaves" value={form.available_leaves} onChange={handleChange} placeholder="Available Leaves" min="0" />
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <button type="submit">{editId ? "Update" : "Add"}</button>
            </form>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Photo</th><th>ID</th><th>Name</th><th>Department</th><th>Contact</th>
                  <th>Email</th><th>Hire Date</th><th>Available Leaves</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>{emp.photo ? <img src={`http://localhost:8081/${emp.photo}`} alt="avatar" className="avatar" /> : "—"}</td>
                    <td>{emp.id}</td><td>{emp.name}</td><td>{emp.department}</td>
                    <td>{emp.contact}</td><td>{emp.email}</td><td>{new Date(emp.hire_date).toLocaleDateString()}</td>
                    <td>{emp.available_leaves}</td>
                    <td>
                      <button className="icon-button" onClick={() => handleEdit(emp)}>✏</button>
                      <button className="icon-button" onClick={() => handleDelete(emp.id)}>🗑</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan="9">No employees found.</td></tr>}
              </tbody>
            </table>
          </>
        );
    case "leave-approval":
  return (
    <div>
      <h3>Leave Approval Requests</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Employee</th>
            <th>Available Leaves</th>
            <th>Leave Type</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Total Days</th>   {/* ✅ Added column */}
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveApproval.length ? leaveApproval.map(leave => {
            // ✅ Calculate total leaves (difference in days + 1)
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            return (
              <tr key={leave.id}>
                <td>{leave.id}</td>
                <td>{leave.employeeName || `EID-${leave.employee_id}`}</td> {/* fallback */}
                <td>{leave.available_leaves ?? "—"}</td>
                <td>{leave.leaveType}</td>
                <td>{start.toLocaleDateString()}</td>
                <td>{end.toLocaleDateString()}</td>
                <td>{totalDays}</td>  {/* ✅ Display total leave days */}
                <td>
                  {leave.status === 'Pending' && <span style={{color:'#f0ad4e'}}>Pending</span>}
                  {leave.status === 'Approved' && <span style={{color:'#5cb85c'}}>Approved</span>}
                  {leave.status === 'Rejected' && <span style={{color:'#d9534f'}}>Rejected</span>}
                </td>
                <td>
                  {leave.status === 'Pending' && (
                    <>
                      <button className="icon-button" onClick={() => handleApprove(leave.id)}>✔</button>
                      <button className="icon-button" onClick={() => handleReject(leave.id)}>✖</button>
                    </>
                  )}
                </td>
              </tr>
            );
          }) : <tr><td colSpan="9">No leave requests found.</td></tr>}
        </tbody>
      </table>
    </div>
  );

      default:
        return <div><h3>Page not found</h3></div>;
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-profile-header">
          {loggedInAdmin?.photo && <img src={loggedInAdmin.photo} alt="Admin" className="admin-avatar" />}
          <h3>{loggedInAdmin?.name}</h3>
          <p>{loggedInAdmin?.email}</p>
        </div>
        <nav>
          <ul>
            <li onClick={() => setView('employees')} className={view === 'employees' ? 'active' : ''}>👤 Employees</li>
            <li onClick={() => setView('jobs')} className={view === 'jobs' ? 'active' : ''}>💼 Job Postings</li>
            <li onClick={() => setView('applications')} className={view === 'applications' ? 'active' : ''}>📄 Applications</li>
            <li onClick={() => setView('ats-scanner')} className={view === 'ats-scanner' ? 'active' : ''}>🔍 ATS Scanner</li>
            <li onClick={() => setView('leave-approval')} className={view === 'leave-approval' ? 'active' : ''}>
              📝 Leave Approval
              {pendingLeaveCount > 0 && <span className="red-dot"></span>}
            </li>
            <li onClick={() => setView('employee-reviews')} className={view === 'employee-reviews' ? 'active' : ''}>📝 Employee Reviews</li>
            <li onClick={() => setView('reports')} className={view === 'reports' ? 'active' : ''}>📊 Reports</li>
            <li onClick={handleSignOut}>🚪 Sign Out</li>
          </ul>
        </nav>
      </aside>
      <main className="admin-content">
        <div className="admin-header">
          <div className="admin-header-left">
            <h3>
              {view === 'employees' && 'Company Employees'}
              {view === 'jobs' && 'Manage Job Postings'}
              {view === 'applications' && 'Job Applications'}
              {view === 'ats-scanner' && 'ATS Resume Scanner'}
              {view === 'leave-approval' && 'Leave Approval Requests'}
              {view === 'employee-reviews' && 'Employee Reviews'}
              {view === 'reports' && 'Reports'}
            </h3>
            {view === 'employees' && (
              <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="admin-search-input" />
            )}
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
