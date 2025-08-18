import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminDashboard.css";

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [view, setView] = useState("overview");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const navigate = useNavigate();

  // Load employee info & leave requests
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

    // Fix photo path if not full URL
    if (user.photo && !user.photo.startsWith("http")) {
      user.photo = `http://localhost:8081/${user.photo}`;
    }

    setEmployee(user);
    fetchLeaveRequests(user.id);
  }, [navigate]);

  // Fetch leave requests for this employee
  const fetchLeaveRequests = async (empId) => {
    try {
      const res = await axios.get(`http://localhost:8081/api/leave-applications/employee/${empId}`);
      setLeaveRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch leave requests:", err);
    }
  };

  // Submit new leave request
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!employee?.id) {
      alert("Error: Your employee ID is missing. Please log in again.");
      return;
    }
    if (!leaveType || !startDate || !endDate) {
      alert("Please fill all fields");
      return;
    }

    try {
      await axios.post("http://localhost:8081/api/leave-applications", {
        employeeId: employee.id,
        leaveType,
        startDate,
        endDate
      });

      alert("✅ Leave request submitted successfully!");
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      fetchLeaveRequests(employee.id);
    } catch (err) {
      console.error("Failed to submit leave request:", err);
      alert("❌ Failed to submit leave request");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/login");
  };

  // Page body content
  const renderContent = () => {
    switch (view) {
      case "overview":
        return (
          <div className="card-box">
            <h2>Welcome, {employee?.name}</h2>
            <p>Role: {employee?.role}</p>
            <p>Email: {employee?.email}</p>
          </div>
        );

      case "profile":
        return (
          <div className="card-box">
            <h2>My Profile</h2>
            <p><strong>Name:</strong> {employee?.name}</p>
            <p><strong>Email:</strong> {employee?.email}</p>
            <p><strong>Employee ID:</strong> {employee?.id ? `EID-${employee.id}` : "EID-XXX"}</p>
            <p><strong>Department:</strong> {employee?.department || "N/A"}</p>
          </div>
        );

      case "leave": 
        return (
          <div className="card-box">
            <h2>Request Leave</h2>
            <form onSubmit={handleLeaveSubmit}>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} required>
                <option value="">-- Select Leave Type --</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Vacation">Vacation</option>
              </select>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              <button type="submit">Submit Leave Request</button>
            </form>

            <h3>My Leave Requests</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length ? leaveRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.leaveType}</td>
                    <td>{new Date(req.startDate).toLocaleDateString()}</td>
                    <td>{new Date(req.endDate).toLocaleDateString()}</td>
                    <td>
                      {req.status === 'Pending' && <span style={{color:'#f0ad4e',fontWeight:'bold'}}>Pending</span>}
                      {req.status === 'Approved' && <span style={{color:'#5cb85c',fontWeight:'bold'}}>Approved</span>}
                      {req.status === 'Rejected' && <span style={{color:'#d9534f',fontWeight:'bold'}}>Rejected</span>}
                    </td>
                  </tr>
                )) : <tr><td colSpan="4">No leave requests found.</td></tr>}
              </tbody>
            </table>
          </div>
        );

      default:
        return <div className="card-box"><p>Section coming soon...</p></div>;
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-profile-header">
          {employee?.photo && <img src={employee.photo} alt="Employee" className="admin-avatar" />}
          <h3>{employee?.name}</h3>
          <p>{employee?.email}</p>
          <p style={{ fontSize: "0.85rem", color: "#ccc" }}>
            {employee?.id ? `EID-${employee.id}` : ""}
          </p>
        </div>

        <div className="sidebar-section-title">EMPLOYEE MENU</div>
        <nav>
          <ul>
            <li onClick={() => setView("overview")} className={view === "overview" ? "active" : ""}>🏠 Overview</li>
            <li onClick={() => setView("profile")} className={view === "profile" ? "active" : ""}>👤 Profile</li>
            <li onClick={() => setView("leave")} className={view === "leave" ? "active" : ""}>🌴 Leave Requests</li>
            <li onClick={() => setView("attendance")} className={view === "attendance" ? "active" : ""}>🕒 Attendance</li>
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
