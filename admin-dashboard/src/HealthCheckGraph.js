import React, { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import Chart from "chart.js/auto";

// List all health endpoints you want to monitor
const endpoints = [
  // Abbreviations (3000)
  { name: "Abbreviations - General", url: "http://localhost:3000/api/abbreviations/health" },
  { name: "Abbreviations - POST", url: "http://localhost:3000/api/abbreviations/health/post" },
  { name: "Abbreviations - ALL", url: "http://localhost:3000/api/abbreviations/health/all" },
  { name: "Abbreviations - By Abbr", url: "http://localhost:3000/api/abbreviations/health/test" },

  // Auth (3000)
  { name: "Auth - General", url: "http://localhost:3000/api/auth/health" },
  { name: "Auth - Signup", url: "http://localhost:3000/api/auth/health/signup" },
  { name: "Auth - Login", url: "http://localhost:3000/api/auth/health/login" },
  { name: "Auth - Profile", url: "http://localhost:3000/api/auth/health/profile" },

  // Dictionary (4001)
  { name: "Dictionary - General", url: "http://localhost:4001/api/dictionary/health" },
  { name: "Dictionary - Upload", url: "http://localhost:4001/api/dictionary/health/upload" },
  { name: "Dictionary - Words", url: "http://localhost:4001/api/dictionary/health/words" },
  { name: "Dictionary - Word", url: "http://localhost:4001/api/dictionary/health/word/test" },

  // PDF Search Engine (5001)
  { name: "PDF - General", url: "http://localhost:5001/api/pdfs/health" },
  { name: "PDF - Search", url: "http://localhost:5001/api/pdfs/health/search" },
  { name: "PDF - Upload", url: "http://localhost:5001/api/pdfs/health/upload" },
  { name: "PDF - All", url: "http://localhost:5001/api/pdfs/health/all" },
  { name: "PDF - By ID", url: "http://localhost:5001/api/pdfs/health/123" }
];

export default function HealthCheckGraph() {
  const [history, setHistory] = useState([]);
  const [labels, setLabels] = useState([]);
  const [currentStatus, setCurrentStatus] = useState([]);
  const [lastCheck, setLastCheck] = useState(null);
  const intervalRef = useRef();

  useEffect(() => {
    const fetchHealth = async () => {
      const now = new Date();
      const label = now.toLocaleTimeString();
      setLabels((prev) => [...prev.slice(-9), label]);
      setLastCheck(now);
      
      const results = await Promise.all(
        endpoints.map(async (ep) => {
          const start = performance.now();
          try {
            const res = await fetch(ep.url);
            const end = performance.now();
            const responseTime = Math.round(end - start);
            return {
              responseTime: res.ok ? responseTime : 0,
              status: res.ok ? 'up' : 'down',
              statusCode: res.status
            };
          } catch (error) {
            return {
              responseTime: 0,
              status: 'down',
              statusCode: null,
              error: error.message
            };
          }
        })
      );
      
      setCurrentStatus(results);
      
      const responseTimes = results.map(r => r.responseTime);
      setHistory((prev) => {
        const next = prev.length >= 10 ? prev.slice(1) : prev;
        return [...next, responseTimes];
      });
    };
    
    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const colors = [
    "#007bff", "#28a745", "#ffc107", "#dc3545",
    "#6610f2", "#20c997", "#fd7e14", "#6f42c1",
    "#17a2b8", "#e83e8c", "#6c757d", "#343a40",
    "#ff6384", "#36a2eb", "#cc65fe", "#ffce56",
    "#00b894", "#fdcb6e"
  ];

  const data = {
    labels,
    datasets: endpoints.map((ep, idx) => ({
      label: ep.name,
      data: history.map(h => h[idx]),
      fill: false,
      borderColor: colors[idx % colors.length],
      tension: 0.1
    }))
  };

  const downRoutes = currentStatus
    .map((status, idx) => ({ ...status, endpoint: endpoints[idx] }))
    .filter(item => item.status === 'down');

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 10, width: '100%', minWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>API Health Dashboard</h3>
        <div style={{ fontSize: 12, color: '#666' }}>
          Last check: {lastCheck?.toLocaleTimeString() || 'Loading...'}
        </div>
      </div>

      {/* Status Summary */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 20 }}>
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: currentStatus.filter(s => s.status === 'up').length > 0 ? '#d4edda' : '#f8d7da',
          border: '1px solid ' + (currentStatus.filter(s => s.status === 'up').length > 0 ? '#c3e6cb' : '#f5c6cb'),
          borderRadius: 4,
          fontSize: 14
        }}>
          ✅ Up: {currentStatus.filter(s => s.status === 'up').length}
        </div>
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: downRoutes.length > 0 ? '#f8d7da' : '#d4edda',
          border: '1px solid ' + (downRoutes.length > 0 ? '#f5c6cb' : '#c3e6cb'),
          borderRadius: 4,
          fontSize: 14
        }}>
          ❌ Down: {downRoutes.length}
        </div>
      </div>

      {/* Down Routes Table */}
      {downRoutes.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h4 style={{ color: '#dc3545', marginBottom: 10 }}>🚨 Routes Currently Down</h4>
          <div style={{ 
            border: '1px solid #dee2e6', 
            borderRadius: 4, 
            overflow: 'hidden',
            fontSize: 14
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Service
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    URL
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {downRoutes.map((route, idx) => (
                  <tr key={idx} style={{ 
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa'
                  }}>
                    <td style={{ 
                      padding: '8px 12px', 
                      borderBottom: idx < downRoutes.length - 1 ? '1px solid #dee2e6' : 'none',
                      fontWeight: 500
                    }}>
                      {route.endpoint.name}
                    </td>
                    <td style={{ 
                      padding: '8px 12px', 
                      borderBottom: idx < downRoutes.length - 1 ? '1px solid #dee2e6' : 'none',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#666'
                    }}>
                      {route.endpoint.url}
                    </td>
                    <td style={{ 
                      padding: '8px 12px', 
                      borderBottom: idx < downRoutes.length - 1 ? '1px solid #dee2e6' : 'none',
                      color: '#dc3545'
                    }}>
                      {route.statusCode ? `HTTP ${route.statusCode}` : 'Connection Failed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Response Time Chart */}
      <div>
        <h4 style={{ marginBottom: 15 }}>Response Time Trends (ms)</h4>
        <div style={{ height: '500px', width: '100%' }}>
          <Line data={data} options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { 
                min: 0, 
                title: { display: true, text: "Response Time (ms)" }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: { font: { size: 10 } }
              }
            }
          }} />
        </div>
      </div>
    </div>
  );
}