// import React, { useEffect, useRef, useState } from "react";
// import { Line } from "react-chartjs-2";
// import Chart from "chart.js/auto";

// const endpoints = [
//   { name: "Abbreviations - General", url: "http://localhost:3000/api/abbreviations/health" },
//   { name: "Abbreviations - POST", url: "http://localhost:3000/api/abbreviations/health/post" },
//   { name: "Abbreviations - ALL", url: "http://localhost:3000/api/abbreviations/health/all" },
//   { name: "Abbreviations - By Abbr", url: "http://localhost:3000/api/abbreviations/health/test" },
//   { name: "Auth - General", url: "http://localhost:3000/api/auth/health" },
//   { name: "Auth - Signup", url: "http://localhost:3000/api/auth/health/signup" },
//   { name: "Auth - Login", url: "http://localhost:3000/api/auth/health/login" },
//   { name: "Auth - Profile", url: "http://localhost:3000/api/auth/health/profile" },
//   { name: "Dictionary - General", url: "http://localhost:4001/api/dictionary/health" },
//   { name: "Dictionary - Upload", url: "http://localhost:4001/api/dictionary/health/upload" },
//   { name: "Dictionary - Words", url: "http://localhost:4001/api/dictionary/health/words" },
//   { name: "Dictionary - Word", url: "http://localhost:4001/api/dictionary/health/word/test" },
//   { name: "PDF - General", url: "http://localhost:5001/api/pdfs/health" },
//   { name: "PDF - Search", url: "http://localhost:5001/api/pdfs/health/search" },
//   { name: "PDF - Upload", url: "http://localhost:5001/api/pdfs/health/upload" },
//   { name: "PDF - All", url: "http://localhost:5001/api/pdfs/health/all" },
//   { name: "PDF - By ID", url: "http://localhost:5001/api/pdfs/health/123" }
// ];

// export default function HealthCheckGraph({ onStatusChange }) {
//   const [history, setHistory] = useState([]);
//   const [labels, setLabels] = useState([]);
//   const [currentStatus, setCurrentStatus] = useState([]);
//   const [lastCheck, setLastCheck] = useState(null);
//   const intervalRef = useRef();

//   useEffect(() => {
//     const fetchHealth = async () => {
//       const now = new Date();
//       const label = now.toLocaleTimeString();
//       setLabels((prev) => [...prev.slice(-9), label]);
//       setLastCheck(now);

//       const results = await Promise.all(
//         endpoints.map(async (ep) => {
//           const start = performance.now();
//           try {
//             const res = await fetch(ep.url);
//             const end = performance.now();
//             const responseTime = Math.round(end - start);
//             return {
//               responseTime: res.ok ? responseTime : 0,
//               status: res.ok ? "up" : "down",
//               statusCode: res.status
//             };
//           } catch (error) {
//             return {
//               responseTime: 0,
//               status: "down",
//               statusCode: null,
//               error: error.message
//             };
//           }
//         })
//       );

//       setCurrentStatus(results);

//       const responseTimes = results.map((r) => r.responseTime);
//       setHistory((prev) => {
//         const next = prev.length >= 10 ? prev.slice(1) : prev;
//         return [...next, responseTimes];
//       });

//       if (typeof onStatusChange === "function") {
//         const anyDown = results.some((r) => r.status !== "up");
//         onStatusChange({ allUp: !anyDown, timestamp: now });
//       }
//     };

//     fetchHealth();
//     intervalRef.current = setInterval(fetchHealth, 5000);
//     return () => clearInterval(intervalRef.current);
//   }, [onStatusChange]);

//   const downRoutes = currentStatus
//     .map((status, idx) => ({ ...status, endpoint: endpoints[idx] }))
//     .filter((item) => item.status === "down");

//   const data = {
//     labels,
//     datasets: endpoints.map((ep, idx) => ({
//       label: ep.name,
//       data: history.map((h) => h[idx]),
//       fill: false,
//       borderColor: `hsl(${(idx * 35) % 360}, 70%, 50%)`,
//       tension: 0.1
//     }))
//   };

//   return (
//     <div style={{ background: "#fff", padding: 20, borderRadius: 10, width: "100%", minWidth: 1000 }}>
//       <h3 style={{ marginBottom: 20 }}>API Health Dashboard</h3>

//       {/* Down Routes Table */}
//       {downRoutes.length > 0 && (
//         <div style={{ marginBottom: 30 }}>
//           <h4 style={{ color: "#dc3545" }}>🚨 Routes Currently Down</h4>
//           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
//             <thead>
//               <tr style={{ backgroundColor: "#f8f9fa" }}>
//                 <th style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>Service</th>
//                 <th style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>URL</th>
//                 <th style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {downRoutes.map((route, idx) => (
//                 <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f1f1f1" }}>
//                   <td style={{ padding: "8px" }}>{route.endpoint.name}</td>
//                   <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 12 }}>{route.endpoint.url}</td>
//                   <td style={{ padding: "8px", color: "#dc3545" }}>
//                     {route.statusCode ? `HTTP ${route.statusCode}` : "Connection Failed"}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Response Time Chart */}
//       <div>
//         <h4 style={{ marginBottom: 15 }}>Response Time Trends (ms)</h4>
//         <div style={{ height: "500px", width: "100%" }}>
//           <Line
//             data={data}
//             options={{
//               responsive: true,
//               maintainAspectRatio: false,
//               scales: {
//                 y: {
//                   min: 0,
//                   title: { display: true, text: "Response Time (ms)" }
//                 }
//               },
//               plugins: {
//                 legend: {
//                   display: true,
//                   position: "bottom",
//                   labels: { font: { size: 10 } }
//                 }
//               }
//             }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }
