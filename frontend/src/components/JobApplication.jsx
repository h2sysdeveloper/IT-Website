// src/components/JobApplication.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/JobBoard.css'; // Make sure this path is correct

const JobApplication = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', coverLetter: '' });
    const [resumeFile, setResumeFile] = useState(null);
    const [error, setError] = useState(''); // State to hold error messages

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                const { data } = await axios.get(`http://localhost:8081/api/public/jobs/${id}`);
                setJob(data);
            } catch (error) {
                console.error("Could not fetch job details:", error);
                setJob({ title: 'Job Not Found' });
            }
        };
        fetchJobDetails();
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleFileChange = (e) => {
        setResumeFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!resumeFile) {
        setError("Please upload your resume.");
        return;
    }

    const submissionData = new FormData();
    submissionData.append('full_name', formData.fullName);   // ✅ match backend
    submissionData.append('email', formData.email);          // ✅ match backend
    submissionData.append('phone', formData.phone);          
    submissionData.append('cover_letter', formData.coverLetter);
    submissionData.append('job_id', id);                     // ✅ send job_id
    submissionData.append('resume', resumeFile);             // ✅ must match multer field name

    try {
        await axios.post(`http://localhost:8081/api/applications/upload`, submissionData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Application submitted successfully!');
        navigate('/jobs');
    } catch (err) {
        console.error("Error submitting application:", err);
        const message = err.response?.data?.message || err.response?.data?.error || 'An unexpected error occurred. Please try again.';
        setError(message);
    }
};


    if (!job) {
        return <div className="application-page">Loading...</div>; // Loading state
    }

    return (
        <div className="application-page">
            <h2>
                Apply for <span className="job-title">{job.title || 'Job Not Found'}</span>
            </h2>
            <hr />
            <form className="application-form" onSubmit={handleSubmit}>
                <label>Full Name:</label>
                <input type="text" name="fullName" onChange={handleInputChange} required />

                <label>Email:</label>
                <input type="email" name="email" onChange={handleInputChange} required />

                <label>Phone (Optional):</label>
                <input type="text" name="phone" onChange={handleInputChange} />

                <label>Upload Resume (PDF/DOCX):</label>
                <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx" required />

                <label>Cover Letter (Optional):</label>
                <textarea name="coverLetter" onChange={handleInputChange} placeholder="Tell us why you're a great fit..." />

                {/* ✅ Display any submission error to the user */}
                {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}

                <button type="submit" className="submit-btn">Submit Application</button>
            </form>
        </div>
    );
};

export default JobApplication;