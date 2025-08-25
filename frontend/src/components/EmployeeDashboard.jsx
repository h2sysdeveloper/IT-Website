// src/pages/EmployeeDashboard.jsx   (adjust path/name to your project)
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminDashboard.css";
import AttendancePanel from "./AttendancePanel"; 

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [view, setView] = useState("overview");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availableLeaves, setAvailableLeaves] = useState({
    Casual: 0,
    Sick: 0,
    Vacation: 0,
  });

  
  const navigate = useNavigate();
  const TOTAL_LEAVES = { Casual: 15, Sick: 10, Vacation: 15 };

  useEffect(() => {
    const stored = localStorage.getItem("loggedInUser");
    if (!stored) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(stored);
    if (user.role !== "Employee") {
      alert("Access denied: Employees only");
      navigate("/");
      return;
    }

    if (user.photo && !user.photo.startsWith("http")) {
      user.photo = `http://localhost:8081/${user.photo}`;
    }

    setEmployee(user);
    fetchLeaveRequests(user.id);
  }, [navigate]);

  const getDays = (from, to) => {
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const fetchLeaveRequests = async (empId) => {
    try {
      const res = await axios.get(`http://localhost:8081/api/leave/employee/${empId}`);
      const leaves = res.data;
      setLeaveRequests(leaves);

      // Calculate used leaves only from approved requests
      const usedLeaves = { Casual: 0, Sick: 0, Vacation: 0 };
      leaves.forEach((req) => {
        if (req.status === "Approved") {
          const days = getDays(req.startDate, req.endDate);
          if (req.leaveType.includes("Casual")) usedLeaves.Casual += days;
          if (req.leaveType.includes("Sick")) usedLeaves.Sick += days;
          if (req.leaveType.includes("Vacation")) usedLeaves.Vacation += days;
        }
      });

      const updatedAvailable = {
        Casual: TOTAL_LEAVES.Casual - usedLeaves.Casual,
        Sick: TOTAL_LEAVES.Sick - usedLeaves.Sick,
        Vacation: TOTAL_LEAVES.Vacation - usedLeaves.Vacation,
      };
      setAvailableLeaves(updatedAvailable);
    } catch (err) {
      console.error("Failed to fetch leave requests:", err);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!employee?.id || !leaveType || !startDate || !endDate) {
      alert("Please fill all fields");
      return;
    }

    const selectedType = leaveType.split(" ")[0];
    const daysRequested = getDays(startDate, endDate);

    if (daysRequested > availableLeaves[selectedType]) {
      alert(`You only have ${availableLeaves[selectedType]} ${selectedType} leave(s) remaining.`);
      return;
    }

    try {
      await axios.post("http://localhost:8081/api/leave-applications", {
        employeeId: employee.id,
        leaveType,
        startDate,
        endDate,
      });

      alert("✅ Leave request submitted successfully!");
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      fetchLeaveRequests(employee.id);
    } catch (err) {
      console.error("Failed to submit leave request:", err.response?.data || err.message);
      alert("❌ Failed to submit leave request");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/login");
  };

  const renderContent = () => {
    switch (view) {
      case "overview":
        return (
          <div style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2>Welcome, {employee?.name}</h2>
            <p>Role: {employee?.role}</p>
            <p>Email: {employee?.email}</p>
          </div>
        );

      case "leave":
        return (
          <div style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginBottom: "15px" }}>🌴 Request Leave</h2>

            {/* Available Leaves */}
            <div style={{ marginBottom: "20px" }}>
              <h4>Available Leaves</h4>
              <div style={{ display: "flex", gap: "20px" }}>
                {["Sick", "Casual", "Vacation"].map((type) => (
                  <div key={type} style={{ backgroundColor: "#f5f5f5", padding: "10px 15px", borderRadius: "6px", textAlign: "center" }}>
                    <span style={{ display: "block", fontSize: "0.85rem", color: "#555" }}>{type}</span>
                    <strong style={{ fontSize: "1.2rem", color: "#333" }}>{availableLeaves[type]}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Form */}
            <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px", maxWidth: "400px" }}>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                style={{ padding: "8px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
              >
                <option value="">-- Select Leave Type --</option>
                {availableLeaves.Casual > 0 && <option value="Casual Leave">Casual Leave</option>}
                {availableLeaves.Sick > 0 && <option value="Sick Leave">Sick Leave</option>}
                {availableLeaves.Vacation > 0 && <option value="Vacation">Vacation</option>}
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ padding: "8px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{ padding: "8px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
              />

              <button type="submit" style={{ backgroundColor: "#4caf50", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer" }}>
                Submit Request
              </button>
            </form>

            {/* Leave Requests Table */}
            <h3 style={{ marginBottom: "10px" }}>My Leave Requests</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f4f4f4" }}>
                  <th style={{ border: "1px solid #ddd", padding: "10px" }}>Type</th>
                  <th style={{ border: "1px solid #ddd", padding: "10px" }}>From</th>
                  <th style={{ border: "1px solid #ddd", padding: "10px" }}>To</th>
                  <th style={{ border: "1px solid #ddd", padding: "10px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length ? leaveRequests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>{req.leaveType}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>{new Date(req.startDate).toLocaleDateString()}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>{new Date(req.endDate).toLocaleDateString()}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center", fontWeight: "bold", color: req.status === "Pending" ? "#f0ad4e" : req.status === "Approved" ? "#5cb85c" : "#d9534f" }}>
                      {req.status}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "10px" }}>No leave requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case "attendance":
        // <-- NEW: show AttendancePanel here
        return (
          <div className="card-box">
            <h2>Attendance</h2>
            <AttendancePanel employee={employee} />
          </div>
        );

      default:
        return <div style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px" }}><p>Section coming soon...</p></div>;
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-profile-header">
          {employee?.photo && <img src={employee.photo} alt="Employee" className="admin-avatar" />}
          <h3>{employee?.name}</h3>
          <p>{employee?.email}</p>
          <p style={{ fontSize: "0.85rem", color: "#ccc" }}>{employee?.id ? `EID-${employee.id}` : ""}</p>
        </div>

        <div className="sidebar-section-title">EMPLOYEE MENU</div>
        <nav>
          <ul>
            <li onClick={() => setView("overview")} className={view === "overview" ? "active" : ""}>🏠 Overview</li>
            <li onClick={() => setView("profile")} className={view === "profile" ? "active" : ""}>👤 Profile</li>
            <li onClick={() => setView("leave")} className={view === "leave" ? "active" : ""}>🌴 Leave Requests</li>
            <li onClick={handleSignOut}>🚪 Sign Out</li>
          </ul>
        </nav>
      </aside>

      <main className="admin-content">
        <div className="admin-header">
          <h3>{view.charAt(0).toUpperCase() + view.slice(1)} Section</h3>
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

export default EmployeeDashboard;
