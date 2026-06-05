"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast, ToastContainer } from "@/components/useToast";

const SUBJECTS = [
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Science",
  "Psychology",
  "Environmental Science",
];

const statusColors = {
  Published: "#004990",
  "Pending Review": "#6b5b00",
  Draft: "#666666",
};

export default function AdminDashboard() {
  const [editions, setEditions] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedEdition, setSelectedEdition] = useState("");
  const [selectedEditionDate, setSelectedEditionDate] = useState("");
  const [newEditionName, setNewEditionName] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSubject, setManualSubject] = useState("Biology");
  const [importTasks, setImportTasks] = useState([
    { id: 1, title: "", subject: "Biology", file: null }
  ]);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { toasts, toast } = useToast();

  useEffect(() => {
    fetch("/api/staff/profile")
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          router.push("/staff/login");
        } else if (data.user.role !== "Admin" && data.user.role !== "Subject Editor") {
          router.push("/staff/dashboard");
        }
      });

    fetch("/api/editions")
      .then(res => res.json())
      .then(data => {
        if (data.editions) {
          setEditions(data.editions);
          if (data.editions.length > 0) setSelectedEdition(data.editions[0]._id);
        }
      });

    fetch("/api/articles")
      .then(res => res.json())
      .then(data => {
        if (data.articles) setArticles(data.articles);
      });
  }, [router]);

  const selectedEditionName = useMemo(() => {
    return editions.find(edition => edition._id === selectedEdition)?.name || "Selected Edition";
  }, [editions, selectedEdition]);

  useEffect(() => {
    const edition = editions.find(e => e._id === selectedEdition);
    if (edition && edition.releaseDate) {
      setSelectedEditionDate(new Date(edition.releaseDate).toISOString().split('T')[0]);
    } else {
      setSelectedEditionDate("");
    }
  }, [selectedEdition, editions]);

  const visibleArticles = useMemo(() => {
    if (!selectedEdition) return articles.filter(article => !article.editionId);
    return articles.filter(article => article.editionId === selectedEdition);
  }, [articles, selectedEdition]);

  const articlesBySubject = useMemo(() => {
    const groups = SUBJECTS.map(subject => ({
      subject,
      articles: visibleArticles.filter(article => article.subject === subject),
    }));
    const uncategorized = visibleArticles.filter(article => !SUBJECTS.includes(article.subject));
    if (uncategorized.length > 0) groups.push({ subject: "Uncategorized", articles: uncategorized });
    return groups;
  }, [visibleArticles]);

  const handleCreateEdition = async (e) => {
    e.preventDefault();
    if (!newEditionName.trim()) return;

    const res = await fetch("/api/editions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newEditionName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setEditions([data.edition, ...editions]);
      setSelectedEdition(data.edition._id);
      setNewEditionName("");
    } else {
      toast.error("Error: " + data.error);
    }
  };

  const handleUpdateEditionDate = async (e) => {
    e.preventDefault();
    if (!selectedEdition) return;

    const res = await fetch(`/api/editions/${selectedEdition}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseDate: selectedEditionDate || null }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Edition date updated.");
      setEditions(editions.map(ed => ed._id === data.edition._id ? data.edition : ed));
    } else {
      toast.error("Error: " + data.error);
    }
  };

  const handleCreateManualDraft = async (e) => {
    e.preventDefault();
    if (!selectedEdition) {
      toast.error("Select an edition first.");
      return;
    }

    setIsCreatingDraft(true);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          subject: manualSubject,
          editionId: selectedEdition,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/edit/${data.articleSlug}`);
      } else {
        toast.error("Error: " + data.error);
      }
    } catch {
      toast.error("Draft creation failed.");
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const addImportTask = () => {
    setImportTasks([...importTasks, { id: Date.now(), title: "", subject: "Biology", file: null }]);
  };

  const removeImportTask = (id) => {
    setImportTasks(importTasks.filter(task => task.id !== id));
  };

  const updateImportTask = (id, field, value) => {
    setImportTasks(importTasks.map(task => task.id === id ? { ...task, [field]: value } : task));
  };

  const handleHtmlZipUpload = async (e) => {
    e.preventDefault();
    if (!selectedEdition) {
      toast.error("Select an edition first.");
      return;
    }

    const validTasks = importTasks.filter(task => task.file && task.title.trim());
    if (validTasks.length === 0) {
      toast.error("Please provide a ZIP file and title for at least one import.");
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failedCount = 0;
    let lastSuccessSlug = null;

    for (const task of validTasks) {
      const formData = new FormData();
      formData.append("file", task.file);
      formData.append("editionId", selectedEdition);
      formData.append("title", task.title.trim());
      formData.append("subject", task.subject);

      try {
        const res = await fetch("/api/articles/import-html-zip", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
          lastSuccessSlug = data.articleSlug;
        } else {
          failedCount++;
          toast.error(`Error importing ${task.title}: ${data.error}`);
        }
      } catch {
        failedCount++;
        toast.error(`Upload failed for ${task.title}.`);
      }
    }

    setIsUploading(false);

    if (successCount > 0 && failedCount === 0) {
      toast.success(`Successfully imported ${successCount} article(s).`);
      setImportTasks([{ id: Date.now(), title: "", subject: "Biology", file: null }]);
      if (successCount === 1 && lastSuccessSlug) {
        router.push(`/admin/edit/${lastSuccessSlug}`);
      } else {
        fetch("/api/articles")
          .then(res => res.json())
          .then(data => {
            if (data.articles) setArticles(data.articles);
          });
      }
    } else if (successCount > 0) {
      toast.info(`Imported ${successCount} article(s), but ${failedCount} failed.`);
      fetch("/api/articles")
        .then(res => res.json())
        .then(data => {
          if (data.articles) setArticles(data.articles);
        });
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div className="admin-container" style={{ maxWidth: "1100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <Link href="/admin/users" className="btn btn-primary">
          Manage Users
        </Link>
      </div>

      <section style={{ border: "1px solid var(--border)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div className="admin-top-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Select Edition</label>
            <select value={selectedEdition} onChange={e => setSelectedEdition(e.target.value)}>
              {editions.map(edition => (
                <option key={edition._id} value={edition._id}>{edition.name}</option>
              ))}
              {editions.length === 0 && <option value="">Create an edition first...</option>}
            </select>
          </div>

          {selectedEdition && (
            <form onSubmit={handleUpdateEditionDate} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Publication Date</label>
                <input
                  type="date"
                  value={selectedEditionDate}
                  onChange={e => setSelectedEditionDate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", fontSize: "1rem" }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem", height: "42px" }}>Save Date</button>
            </form>
          )}
        </div>

        <div className="admin-top-grid" style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <form onSubmit={handleCreateEdition} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              value={newEditionName}
              onChange={e => setNewEditionName(e.target.value)}
              placeholder="New Edition Name"
              style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border)", fontSize: "1rem" }}
            />
            <button type="submit" className="btn btn-primary">Create Edition</button>
          </form>
        </div>
      </section>

      <section style={{ border: "1px solid var(--border)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
          <h2 style={{ marginBottom: 0 }}>Articles by Category</h2>
          <span style={{ color: "#555", fontSize: "0.95rem" }}>{selectedEditionName}</span>
        </div>

        {visibleArticles.length === 0 ? (
          <p style={{ color: "#555", marginBottom: 0 }}>No articles for this edition yet.</p>
        ) : (
          articlesBySubject.map(group => (
            <div key={group.subject} style={{ marginTop: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", color: "#111111", marginBottom: "0.5rem" }}>
                {group.subject}
                <span style={{ color: "#666", fontFamily: "system-ui, sans-serif", fontSize: "0.9rem", fontWeight: 400, marginLeft: "0.5rem" }}>
                  {group.articles.length}
                </span>
              </h3>

              {group.articles.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: 0 }}>No articles marked for this category.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, borderTop: "1px solid var(--border)" }}>
                  {group.articles.map(article => (
                    <li key={article._id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "1rem", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                      <strong style={{ color: "#111111" }}>{article.title}</strong>
                      <span style={{ color: statusColors[article.status] || "#666666", border: "1px solid var(--border)", padding: "0.2rem 0.45rem", fontSize: "0.8rem" }}>
                        {article.status}
                      </span>
                      <Link href={`/admin/edit/${article.slug}`} className="btn" style={{ padding: "0.35rem 0.8rem", fontSize: "0.9rem", border: "1px solid var(--border)" }}>
                        Edit
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </section>

      <section style={{ border: "1px solid var(--border)", padding: "1.5rem", marginBottom: "1rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Create Article</h2>
        <form onSubmit={handleCreateManualDraft} className="admin-create-grid">
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

      <section style={{ border: "1px solid var(--border)", padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Automated ZIP Import</h2>
        <form onSubmit={handleHtmlZipUpload}>
          {importTasks.map((task, index) => (
            <div key={task.id} className="admin-import-grid" style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: index < importTasks.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Imported Title</label>
                <input value={task.title} onChange={e => updateImportTask(task.id, 'title', e.target.value)} placeholder="e.g. Why does slang change so fast" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Category</label>
                <select value={task.subject} onChange={e => updateImportTask(task.id, 'subject', e.target.value)}>
                  {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>ZIP File</label>
                <input type="file" accept=".zip" onChange={e => updateImportTask(task.id, 'file', e.target.files?.[0] || null)} required />
              </div>
              {importTasks.length > 1 && (
                <button type="button" className="btn" onClick={() => removeImportTask(task.id)} style={{ alignSelf: "end", border: "1px solid var(--border)", padding: "0.5rem" }}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="button" className="btn" onClick={addImportTask} style={{ border: "1px solid var(--border)" }}>
              + Add Another File
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUploading || !selectedEdition}>
              {isUploading ? "Importing..." : "Upload All ZIPs"}
            </button>
          </div>
        </form>
      </section>
    </div>
    </>
  );
}
