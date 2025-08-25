// EnrollFromPhoto.jsx
import React, { useRef, useState, useEffect } from "react";

export default function EnrollFromPhoto({ employeeId }) {
  const inputRef = useRef();
  const [status, setStatus] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    // load face-api from CDN (same as AttendancePanel)
    async function load() {
      if (!window.faceapi) {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
        s.crossOrigin = "anonymous";
        document.head.appendChild(s);
        await new Promise(r => (s.onload = r));
      }
      const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
      await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    }
    load();
  }, []);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!employeeId) return setStatus("Employee ID missing: save the employee first then enroll.");
    setStatus("Computing descriptor...");
    const img = await readFileAsImage(file);
    const det = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (!det) {
      setStatus("No face detected in image. Try another photo.");
      return;
    }
    const descriptor = Array.from(det.descriptor);
    setStatus("Sending descriptor to server...");
    try {
      await fetch("http://localhost:8081/api/enroll-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, descriptor })
      });
      setStatus("Enrolled successfully.");
    } catch (err) {
      console.error(err);
      setStatus("Enroll failed. See console.");
    }
  }

  function readFileAsImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
        img.onload = () => resolve(img);
        img.onerror = reject;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} disabled={!modelsLoaded} />
      <div style={{ marginTop: 8 }}>{status || (modelsLoaded ? "Ready to enroll image." : "Loading models...")}</div>
    </div>
  );
}
