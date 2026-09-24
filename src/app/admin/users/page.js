"use client";

import { useState, useEffect, useRef } from "react";
import { useToast, ToastContainer } from "@/components/useToast";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toasts, toast } = useToast();

  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("Staff");
  const [formSubjects, setFormSubjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bulkText, setBulkText] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Inline editing state
  const [editingCell, setEditingCell] = useState({ id: null, field: null });
  const [editValue, setEditValue] = useState("");
  const [editSubjects, setEditSubjects] = useState([]);
  const editingRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {
      toast.error("Failed to fetch users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail,
          role: formRole,
          managedSubjects: formRole === "Subject Editor" ? formSubjects : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User added/updated successfully");
        setFormEmail("");
        setFormRole("Staff");
        setFormSubjects([]);
        fetchUsers();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch {
      toast.error("Failed to submit user data");
    }
    setIsSubmitting(false);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setIsBulkSubmitting(true);
    
    // Parse input
    const regex = /([^<,]+)?<([^>]+)>/g;
    const matches = [...bulkText.matchAll(regex)];
    
    let usersToCreate = matches.map(m => ({ name: m[1]?.trim() || "New User", email: m[2]?.trim() }));
    
    if (usersToCreate.length === 0) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
      const emailMatches = [...bulkText.matchAll(emailRegex)];
      usersToCreate = emailMatches.map(m => ({ name: "New User", email: m[1] }));
    }

    if (usersToCreate.length === 0) {
      toast.error("No valid email contacts found.");
      setIsBulkSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: usersToCreate, role: "Staff" })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully added/updated ${data.count} users.`);
        setBulkText("");
        fetchUsers();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch {
      toast.error("Failed to submit bulk users");
    }
    setIsBulkSubmitting(false);
  };

  const handleSubjectChange = (subject) => {
    if (formSubjects.includes(subject)) {
      setFormSubjects(formSubjects.filter(s => s !== subject));
    } else {
      setFormSubjects([...formSubjects, subject]);
    }
  };

  const closeEditor = () => {
    editingRef.current = null;
    setEditingCell({ id: null, field: null });
  };

  const handleEditClick = (u, field) => {
    editingRef.current = { id: u._id, field };
    setEditingCell({ id: u._id, field });
    if (field === "name") setEditValue(u.name || "");
    if (field === "email") setEditValue(u.email || "");
    if (field === "title") setEditValue(u.title || "");
    if (field === "bio") setEditValue(u.bio || "");
    if (field === "role") setEditValue(u.role || "Staff");
    if (field === "subjects") setEditSubjects(u.managedSubjects || []);
  };

  const replaceUser = (id, next) => {
    setUsers(prev => prev.map(x => (x._id === id ? next : x)));
  };

  const handleInlineSave = async (u) => {
    const cell = editingRef.current;
    if (!cell) return;
    closeEditor();

    const isSubjects = cell.field === "subjects";
    const unchanged = isSubjects
      ? JSON.stringify(u.managedSubjects || []) === JSON.stringify(editSubjects)
      : (u[cell.field] ?? "") === editValue;
    if (unchanged) return;

    const changes = isSubjects ? { managedSubjects: editSubjects } : { [cell.field]: editValue };
    replaceUser(u._id, { ...u, ...changes });

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u._id, ...changes }),
      });
      const data = await res.json();
      if (data.success) {
        replaceUser(u._id, data.user);
        toast.success("Updated successfully");
      } else {
        replaceUser(u._id, u);
        toast.error("Error: " + data.error);
      }
    } catch {
      replaceUser(u._id, u);
      toast.error("Failed to update");
    }
  };

  const renderCell = (u, field) => {
    const isEditing = editingCell.id === u._id && editingCell.field === field;

    if (isEditing) {
      if (field === "name" || field === "email" || field === "title") {
        return (
          <input
            autoFocus
            type={field === "email" ? "email" : "text"}
            placeholder={field === "title" ? "Staff" : undefined}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInlineSave(u);
              if (e.key === "Escape") closeEditor();
            }}
            onBlur={() => handleInlineSave(u)}
            style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--primary)", outline: "none", boxSizing: "border-box" }}
          />
        );
      }
      if (field === "role") {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              // We need to blur explicitly to trigger save or let the user click away.
            }}
            onBlur={() => handleInlineSave(u)}
            style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--primary)", outline: "none", boxSizing: "border-box" }}
          >
            <option value="Staff">Staff</option>
            <option value="Subject Editor">Subject Editor</option>
            <option value="Admin">Admin</option>
          </select>
        );
      }
      if (field === "bio") {
        return (
          <div>
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeEditor();
              }}
              style={{ width: "100%", height: "120px", padding: "0.5rem", border: "1px solid var(--primary)", outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontSize: "0.9rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button onClick={() => handleInlineSave(u)} style={{ background: "var(--primary)", color: "#fff", padding: "0.4rem 0.8rem", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Save</button>
              <button onClick={closeEditor} style={{ background: "#ccc", color: "#000", padding: "0.4rem 0.8rem", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
            </div>
          </div>
        );
      }
      if (field === "subjects") {
        if (u.role !== "Subject Editor") return <span style={{ color: "#aaa" }}>N/A</span>;
        
        return (
          <div style={{ position: "relative", zIndex: 10 }}>
             <select
               autoFocus
               multiple
               value={editSubjects}
               onChange={(e) => {
                 const values = Array.from(e.target.selectedOptions, option => option.value);
                 setEditSubjects(values);
               }}
               style={{ width: "100%", height: "120px", padding: "0.25rem", border: "1px solid var(--primary)", outline: "none", boxSizing: "border-box" }}
             >
                {SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
             </select>
             <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button onClick={() => handleInlineSave(u)} style={{ background: "var(--primary)", color: "#fff", padding: "0.4rem 0.8rem", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Save</button>
                <button onClick={closeEditor} style={{ background: "#ccc", color: "#000", padding: "0.4rem 0.8rem", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
             </div>
          </div>
        );
      }
    }

    // Not editing view
    let displayValue = null;
    if (field === "name") displayValue = u.name;
    if (field === "email") displayValue = u.email;
    if (field === "title") displayValue = u.title || <span style={{ color: "#aaa" }}>Staff</span>;
    if (field === "bio") {
      displayValue = u.bio
        ? <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.bio}</span>
        : <span style={{ color: "#ccc" }}>—</span>;
    }
    if (field === "role") {
      displayValue = (
        <span style={{ 
          padding: "0.2rem 0.5rem", 
          background: u.role === "Admin" ? "var(--primary)" : u.role === "Subject Editor" ? "var(--accent-yellow)" : "#f0f0f0",
          color: u.role === "Admin" ? "#fff" : "#000",
          borderRadius: "4px",
          fontWeight: "bold",
          fontSize: "0.8rem"
        }}>
          {u.role}
        </span>
      );
    }
    if (field === "subjects") {
      displayValue = u.role === "Subject Editor" 
        ? (u.managedSubjects?.length > 0 ? u.managedSubjects.join(", ") : "—") 
        : <span style={{ color: "#ccc" }}>—</span>;
    }

    return (
      <div 
        onClick={() => {
          if (field === "subjects" && u.role !== "Subject Editor") return;
          handleEditClick(u, field);
        }} 
        style={{ cursor: field === "subjects" && u.role !== "Subject Editor" ? "default" : "pointer", padding: "0.75rem 0.5rem", border: "1px dashed transparent" }}
        title="Click to edit"
        onMouseEnter={(e) => {
          if (field === "subjects" && u.role !== "Subject Editor") return;
          e.currentTarget.style.border = "1px dashed #ccc";
          e.currentTarget.style.background = "#fafafa";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = "1px dashed transparent";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {displayValue}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem", background: "#ffffff", minHeight: "100vh" }}>
      <ToastContainer toasts={toasts} />
      
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)", fontWeight: "bold" }}>
          <ArrowLeft size={16} /> Back to Admin Dashboard
        </Link>
      </div>

      <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--primary)", marginBottom: "2rem" }}>User Management</h1>

      <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
        
        {/* Whitelist Single User Form */}
        <div style={{ border: "1px solid var(--border)", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#000000" }}>
            <UserPlus size={18} /> Whitelist Single User
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 250px" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Google Email Address</label>
                <input 
                  type="email" 
                  value={formEmail} 
                  onChange={e => setFormEmail(e.target.value)} 
                  required 
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)" }} 
                  placeholder="author@example.com"
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Role</label>
                <select 
                  value={formRole} 
                  onChange={e => setFormRole(e.target.value)} 
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)" }}
                >
                  <option value="Staff">Staff</option>
                  <option value="Subject Editor">Subject Editor</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            {formRole === "Subject Editor" && (
              <div style={{ background: "#fafafa", padding: "1rem", border: "1px solid var(--border)", marginTop: "0.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Managed Subjects</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                  {SUBJECTS.map(sub => (
                    <label key={sub} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                      <input 
                        type="checkbox" 
                        checked={formSubjects.includes(sub)} 
                        onChange={() => handleSubjectChange(sub)} 
                      />
                      {sub}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ alignSelf: "flex-start", padding: "0.6rem 1.5rem", background: "var(--primary)", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer", marginTop: "1rem" }}
            >
              {isSubmitting ? "Saving..." : "Whitelist User"}
            </button>
          </form>
        </div>

        {/* Bulk Import Users Form */}
        <div style={{ border: "1px solid var(--border)", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#000000" }}>
            <UserPlus size={18} /> Bulk Whitelist Staff
          </h2>
          <form onSubmit={handleBulkSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Paste Email Contacts</label>
              <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                Accepts format: <code>Name &lt;email@domain.com&gt;, Name &lt;email@domain.com&gt;</code> or just a list of emails. All imported users will be set as Staff.
              </p>
              <textarea 
                value={bulkText} 
                onChange={e => setBulkText(e.target.value)} 
                required 
                style={{ width: "100%", height: "100px", padding: "0.5rem", border: "1px solid var(--border)", fontFamily: "monospace" }} 
                placeholder="Ivy Glenn <iglenn28@nobles.edu>, Evan Wei <ewei27@nobles.edu>..."
              />
            </div>
            <button 
              type="submit" 
              disabled={isBulkSubmitting}
              style={{ alignSelf: "flex-start", padding: "0.6rem 1.5rem", background: "var(--primary)", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer" }}
            >
              {isBulkSubmitting ? "Importing..." : "Import Users"}
            </button>
          </form>
        </div>

        {/* User List */}
        <div style={{ border: "1px solid var(--border)", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#000000" }}>All Users</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Click any field in the table below to edit it inline.</p>
          
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 0.5rem", width: "14%" }}>Name</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "18%" }}>Email</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "11%" }}>Role</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "14%" }}>Title</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "15%" }}>Subjects</th>
                    <th style={{ padding: "0.75rem 0.5rem", width: "28%" }}>Bio</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0", verticalAlign: "top" }}>{renderCell(u, "name")}</td>
                      <td style={{ padding: "0", verticalAlign: "top" }}>{renderCell(u, "email")}</td>
                      <td style={{ padding: "0", verticalAlign: "top" }}>{renderCell(u, "role")}</td>
                      <td style={{ padding: "0", verticalAlign: "top" }}>{renderCell(u, "title")}</td>
                      <td style={{ padding: "0", verticalAlign: "top" }}>{renderCell(u, "subjects")}</td>
                      <td style={{ padding: "0", verticalAlign: "top" }}>{renderCell(u, "bio")}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: "1rem", textAlign: "center", color: "#888" }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
