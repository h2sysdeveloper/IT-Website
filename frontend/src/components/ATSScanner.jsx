import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ATSScanner = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8081/api/reports/multi-job-scan")
      .then((res) => setReports(res.data))
      .catch((err) => console.error("Error fetching ATS reports", err));
  }, []);

  return (
    <div className="p-4">
      <h2>📄 Multi-Job ATS Resume Scanner</h2>
      <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f4f4f4" }}>
            <th>Candidate</th>
            <th>Email</th>
            <th>Job Title</th>
            <th>Job ID</th>
            <th>ATS Score</th>
            <th>Matched Skills</th>
            <th>Submitted At</th>
            <th>Resume</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((item, index) => (
            <tr key={index}>
              <td>{item.full_name}</td>
              <td>{item.email}</td>
              <td>{item.job_title}</td>
              <td>{item.job_id}</td>
              <td>{item.ats_score}%</td>
              <td>{item.matched_skills}</td>
              <td>{new Date(item.submitted_at).toLocaleString()}</td>
              <td>
                <a
                  href={`http://localhost:8081/uploads/resumes/${item.resume_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Resume
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ATSScanner;
