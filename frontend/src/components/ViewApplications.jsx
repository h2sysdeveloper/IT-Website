import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/ViewApplications.css";

const ViewApplications = () => {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8081/api/applications")
      .then((res) => setApplications(res.data))
      .catch((err) => console.error("Failed to fetch applications:", err));
  }, []);

  return (
    <div className="applications-section">
      <h2>Job Applications</h2>
      {applications.length === 0 ? (
        <p>No applications found.</p>
      ) : (
        <table className="applications-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Job Title</th>
              <th>Applicant Name</th>
              <th>Email</th>
              <th>Resume</th>
              <th>Applied On</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>{app.id}</td>
                <td>{app.job_title || "N/A"}</td>
                <td>{app.full_name || app.name}</td>
                <td>{app.email}</td>
                <td>
                  {app.resume_path ? (
                    <a
                      href={`http://localhost:8081/uploads/resumes/${app.resume_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  ) : (
                    "No Resume"
                  )}
                </td>
                <td>{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ViewApplications;
