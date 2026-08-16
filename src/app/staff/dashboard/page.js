"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings, LogOut, FileText } from "lucide-react";

const SUBJECTS = [
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Science",
  "Psychology",
  "Environmental Science",
];

export default function StaffDashboard() {
  const [articles, setArticles] = useState([]);
  const [editions, setEditions] = useState([]);
  const [selectedEdition, setSelectedEdition] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSubject, setManualSubject] = useState("Biology");
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, articlesRes, editionsRes] = await Promise.all([
        fetch("/api/staff/profile"),
        fetch("/api/articles"),
        fetch("/api/editions")
      ]);
      const profileData = await profileRes.json();
      const articlesData = await articlesRes.json();
      const editionsData = await editionsRes.json();

      if (profileData.success) {
        setUser(profileData.user);
        
        if (articlesData.articles) {
          setArticles(articlesData.articles);
        }
        
        if (editionsData.editions) {
          setEditions(editionsData.editions);
          if (editionsData.editions.length > 0) {
            setSelectedEdition(editionsData.editions[0]._id);
          }
        }
      } else {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/staff/login";
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/staff/login";
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!selectedEdition) {
      alert("Select an edition first.");
      return;
    }

    setIsCreatingDraft(true);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: manualTitle, subject: manualSubject, editionId: selectedEdition }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/admin/edit/${data.articleSlug}`;
      } else {
        alert("Failed to create: " + data.error);
      }
    } catch {
      alert("Error creating article.");
    } finally {
      setIsCreatingDraft(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem", background: "#ffffff", minHeight: "100vh" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--primary)", margin: 0 }}>
            Welcome, {user?.name}
          </h1>
          <p style={{ color: "#555", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
            Role: <strong>{user?.role}</strong> 
            {user?.role === "Subject Editor" && ` (${user?.managedSubjects?.join(", ")})`}
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "1rem" }}>
          {user?.role === "Admin" && (
            <Link href="/admin" className="btn" style={{ border: "1px solid var(--primary)", color: "var(--primary)", padding: "0.5rem 1rem", textDecoration: "none" }}>
              Admin Panel
            </Link>
          )}
          <Link href="/staff/settings" className="btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", border: "1px solid var(--border)", color: "#111", padding: "0.5rem 1rem", textDecoration: "none" }}>
            <Settings size={16} /> Profile
          </Link>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "transparent", border: "1px solid #dc2626", color: "#dc2626", padding: "0.5rem 1rem", cursor: "pointer" }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", color: "#000000", margin: 0 }}>Your Articles</h2>
      </div>

      <section style={{ border: "1px solid var(--border)", padding: "1.5rem", marginBottom: "1rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Create Article</h2>
        <form onSubmit={handleCreateNew} className="admin-create-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Edition</label>
            <select value={selectedEdition} onChange={e => setSelectedEdition(e.target.value)}>
              {editions.map(edition => (
                <option key={edition._id} value={edition._id}>{edition.name}</option>
              ))}
              {editions.length === 0 && <option value="">No editions available</option>}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Title</label>
            <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Untitled Draft" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <select value={manualSubject} onChange={e => setManualSubject(e.target.value)}>
              {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isCreatingDraft || !selectedEdition}>
            {isCreatingDraft ? "Creating..." : "Create Blank Draft"}
          </button>
        </form>
      </section>

      <div style={{ border: "1px solid var(--border)" }}>
        {articles.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#666" }}>
            <FileText size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto", display: "block" }} />
            <p>You don't have any articles yet.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", background: "#f9f9f9" }}>
                <th style={{ padding: "1rem" }}>Title</th>
                <th style={{ padding: "1rem" }}>Subject</th>
                <th style={{ padding: "1rem" }}>Status</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article._id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1rem", fontWeight: "500", color: "#111" }}>
                    {article.title}
                  </td>
                  <td style={{ padding: "1rem", color: "#555" }}>{article.subject}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "1rem",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      background: article.status === "Published" ? "#dcfce7" : article.status === "Pending Review" ? "#fef9c3" : "#f1f5f9",
                      color: article.status === "Published" ? "#166534" : article.status === "Pending Review" ? "#854d0e" : "#475569"
                    }}>
                      {article.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right" }}>
                    <Link 
                      href={`/admin/edit/${article.slug}`} 
                      style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: "bold" }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
