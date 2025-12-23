"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GetSessionTokenPage() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("huntmaster_session");
    setSessionToken(session);
  }, []);

  const handleCopy = () => {
    if (sessionToken) {
      navigator.clipboard.writeText(sessionToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!sessionToken) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#0a0a0a" }}>
        <Card style={{ maxWidth: "500px", width: "100%" }}>
          <CardHeader>
            <CardTitle>Session Token Helper</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: "#666", marginBottom: "16px" }}>
              You need to be logged in to get your session token.
            </p>
            <Button onClick={() => window.location.href = "/login"}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#0a0a0a" }}>
      <Card style={{ maxWidth: "600px", width: "100%" }}>
        <CardHeader>
          <CardTitle>Your Session Token</CardTitle>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
            Copy this token to configure the browser extension
          </p>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
              Session Token:
            </label>
            <div style={{ 
              background: "#1a1a1a", 
              padding: "12px", 
              borderRadius: "6px", 
              border: "1px solid #333",
              wordBreak: "break-all",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#fff",
              maxHeight: "200px",
              overflowY: "auto"
            }}>
              {sessionToken}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <Button onClick={handleCopy} style={{ flex: 1 }}>
              {copied ? "✓ Copied!" : "Copy Token"}
            </Button>
          </div>
          <div style={{ 
            padding: "12px", 
            background: "#1a3a1a", 
            borderRadius: "6px", 
            fontSize: "13px",
            color: "#9ad97a"
          }}>
            <strong>Security Note:</strong> Keep this token private. It provides access to your HuntMaster account.
            Never share it publicly or commit it to version control.
          </div>
          <div style={{ marginTop: "24px", padding: "16px", background: "#f3f4f6", borderRadius: "8px", fontSize: "14px", color: "#666" }}>
            <strong>Instructions:</strong>
            <ol style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li style={{ marginBottom: "8px" }}>Copy the token above</li>
              <li style={{ marginBottom: "8px" }}>Open the browser extension popup</li>
              <li style={{ marginBottom: "8px" }}>Paste the token into the "Session Token" field</li>
              <li style={{ marginBottom: "8px" }}>Set the API Base URL (default: https://huntmaster.vercel.app)</li>
              <li>Click "Save Configuration"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}














