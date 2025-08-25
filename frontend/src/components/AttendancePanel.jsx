// frontend/src/components/AttendancePanel.jsx
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

/*
 AttendancePanel - loads face-api from CDN and models from CDN weights.
 Buttons:
  - Start Camera: always available (starts browser camera)
  - Stop Camera: stops camera
  - Mark Attendance: enabled when modelsLoaded === true
  - Enroll (3 shots): enabled when modelsLoaded === true

 Note: This uses the public CDN for quick testing:
  - face-api script: https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js
  - weights: https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights
*/

export default function AttendancePanel({ employee }) {
  const videoRef = useRef(null);
  const [faceapiLoaded, setFaceapiLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [loading, setLoading] = useState(false);

  // Load the face-api script from CDN dynamically (so no npm dependency required)
  useEffect(() => {
    let cancelled = false;

    async function loadFaceApiScriptAndModels() {
      try {
        setStatus("Loading face-api script...");

        // If faceapi already present (e.g., from other page), reuse it
        if (!window.faceapi) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
            s.crossOrigin = "anonymous";
            s.onload = () => resolve();
            s.onerror = (e) => reject(new Error("Failed to load face-api script"));
            document.head.appendChild(s);
          });
        }

        if (cancelled) return;
        setFaceapiLoaded(true);
        setStatus("face-api loaded. Loading models...");

        // Load models from CDN weights (fastest for initial testing)
        // Alternative: point MODEL_URL = "/models" if you host them locally under public/models
        const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

        // Use the global faceapi object from the CDN script
        const faceapi = window.faceapi;

        // Load the 3 models we need (ssdMobilenetv1, landmarks, recognition)
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        if (cancelled) return;
        setModelsLoaded(true);
        setStatus("✅ Models loaded. You can now Mark Attendance or Enroll.");
      } catch (err) {
        console.error("Model/script load error:", err);
        setStatus("Failed to load face models. (Using CDN) Check console and network.");
        setModelsLoaded(false);
      }
    }

    loadFaceApiScriptAndModels();
    return () => { cancelled = true; };
  }, []);

  // Start camera (always allow)
  const startCamera = async () => {
    setStatus("Starting camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus(modelsLoaded ? "Camera started. Models loaded." : "Camera started. Models still loading...");
    } catch (err) {
      console.error("Camera start error:", err);
      setStatus("Camera access denied or not available. Check browser permissions.");
    }
  };

  const stopCamera = () => {
    const s = videoRef.current?.srcObject;
    if (s && s.getTracks) s.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("Camera stopped.");
  };

  // Take snapshot, get descriptor and send to /api/attendance/mark
  // instrumented captureAndSend — paste into AttendancePanel.jsx replacing old function
const captureAndSend = async () => {
  if (!modelsLoaded) {
    setStatus("Models not loaded yet. Wait a moment.");
    return;
  }
  setLoading(true);
  setStatus("Capturing snapshot...");
  try {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setStatus("Camera not ready. Click Start Camera and allow access.");
      setLoading(false);
      return;
    }

    // snapshot to canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // detect & descriptor
    const detection = await window.faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      setStatus("No face detected. Center your face and try again.");
      setLoading(false);
      return;
    }

    const descriptor = Array.from(detection.descriptor);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);

    setStatus("Sending descriptor to server...");
    console.log("Sending payload:", { descriptorLength: descriptor.length, imageSize: imageBase64.length });

    // make request and capture errors
    try {
      const resp = await axios.post("http://localhost:8081/api/attendance/mark", { descriptor, imageBase64 }, { timeout: 20000 });
      console.log("Server response:", resp);
      if (resp.data) {
        if (resp.data.matched === false) {
          setStatus("No match: " + (resp.data.message || "unknown"));
        } else {
          setStatus(resp.data.message || "Attendance recorded");
        }
      } else {
        setStatus("Empty response from server.");
      }
    } catch (axiosErr) {
      // axios error object has useful info
      console.error("Axios error:", axiosErr);
      if (axiosErr.response) {
        // server responded with status != 2xx
        console.error("Server response data:", axiosErr.response.data);
        setStatus("Server error: " + (axiosErr.response.data.message || JSON.stringify(axiosErr.response.data)));
      } else if (axiosErr.request) {
        // no response
        console.error("No response received. Request info:", axiosErr.request);
        setStatus("No response from server (network or CORS issue). Check backend and Network tab.");
      } else {
        // something else
        setStatus("Request error: " + axiosErr.message);
      }
    }
  } catch (err) {
    console.error("captureAndSend outer error:", err);
    setStatus("Error capturing or sending attendance — check console.");
  } finally {
    setLoading(false);
  }
};

  // Enroll: take 3 shots and send descriptors to /api/enroll-face
  const enrollSelf = async () => {
    if (!employee?.id) return alert("Employee ID missing. Log in and try again.");
    if (!modelsLoaded) {
      setStatus("Models not loaded yet. Wait a moment.");
      return;
    }
    setLoading(true);
    setStatus("Enrolling: taking 3 shots (turn head slightly between shots)...");
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        setStatus("Camera not ready. Click Start Camera and allow access.");
        setLoading(false);
        return;
      }

      const descriptors = [];
      for (let i = 0; i < 3; i++) {
        // small pause for slight head movement
        await new Promise(r => setTimeout(r, 700));
        const c = document.createElement("canvas");
        c.width = video.videoWidth || 320;
        c.height = video.videoHeight || 240;
        const ctx = c.getContext("2d");
        ctx.drawImage(video, 0, 0, c.width, c.height);
        const det = await window.faceapi.detectSingleFace(c).withFaceLandmarks().withFaceDescriptor();
        if (det) descriptors.push(Array.from(det.descriptor));
      }

      if (!descriptors.length) {
        setStatus("No faces detected while enrolling. Try again with better lighting.");
        setLoading(false);
        return;
      }

      // send descriptors to enroll endpoint (saves to DB). We send them one by one here.
      for (const d of descriptors) {
        await axios.post("http://localhost:8081/api/enroll-face", { employeeId: employee.id, descriptor: d });
      }
      setStatus(`Enrolled ${descriptors.length} descriptors successfully.`);
    } catch (err) {
      console.error("Enroll error:", err);
      setStatus("Enrollment failed. Check console and backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h2>Attendance</h2>

      <div style={{ marginBottom: 8 }}>
        {/* Start camera is always enabled so user can see themselves even if models haven't loaded */}
        <button onClick={startCamera}>Start Camera</button>
        <button onClick={stopCamera} style={{ marginLeft: 8 }}>Stop Camera</button>

        {/* Mark & Enroll only enabled when models loaded */}
        <button
          onClick={captureAndSend}
          disabled={!modelsLoaded || loading}
          style={{ marginLeft: 8 }}
        >
          Mark Attendance
        </button>

        <button
          onClick={enrollSelf}
          disabled={!modelsLoaded || loading}
          style={{ marginLeft: 8 }}
        >
          Enroll (3 shots)
        </button>
      </div>

      <div>
        <video ref={videoRef} width="360" height="270" style={{ border: "1px solid #ddd" }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginTop: 10, fontSize: "0.9rem", color: "#666" }}>
        <div>Attendance windows: Morning 10:30–11:00, Evening 18:00–18:30</div>
        <div>Tip: Use good lighting and center your face in the frame.</div>
      </div>
    </div>
  );
}
