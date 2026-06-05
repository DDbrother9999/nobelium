"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useToast, ToastContainer } from "@/components/useToast";

export default function ClientArticleEditor({ initialArticle, users, editions }) {
  const router = useRouter();
  const { toasts, toast } = useToast();

  const [title, setTitle] = useState(initialArticle.title || "");
  const [slug, setSlug] = useState(initialArticle.slug || "");
  const [subject, setSubject] = useState(initialArticle.subject || "Biology");
  const [content, setContent] = useState(initialArticle.content || "");
  const [headerImageUrl, setHeaderImageUrl] = useState(initialArticle.headerImageUrl || "");
  const [authorId, setAuthorId] = useState(initialArticle.authorId || "");
  const [editionId, setEditionId] = useState(initialArticle.editionId || "");
  const [status, setStatus] = useState(initialArticle.status || "Draft");
  const [imageBank, setImageBank] = useState(initialArticle.imageBank || []);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/articles/${initialArticle.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, subject, content, headerImageUrl, imageBank, authorId, editionId, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Article saved successfully!");
        router.refresh();
        if (slug !== initialArticle.slug) {
          window.location.href = `/admin/edit/${slug}`;
        } else if (status === "Published") {
          router.push(`/articles/${slug}`);
        }
      } else {
        toast.error("Error saving: " + data.error);
      }
    } catch {
      toast.error("Failed to save — please try again.");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setPendingDelete(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/articles/${initialArticle.slug}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Article deleted.");
        setTimeout(() => router.push("/admin"), 1200);
      } else {
        toast.error("Failed to delete article.");
        setPendingDelete(false);
      }
    } catch {
      toast.error("Error deleting article.");
      setPendingDelete(false);
    }
  };

  const currentEdition = editions.find(ed => ed._id === editionId);
  const currentEditionSlug = currentEdition ? currentEdition.slug : "unknown-edition";
  const currentArticleSlug = slug || "untitled-article";

  return (
    <>
      <ToastContainer toasts={toasts} />

      {/* Delete confirmation overlay */}
      {pendingDelete && (
        <>
          <style>{`
            .delete-overlay {
              position: fixed; inset: 0; background: rgba(0,0,0,0.35);
              z-index: 9000; display: flex; align-items: center; justify-content: center;
            }
            .delete-dialog {
              background: #fff; border: 1px solid var(--border);
              padding: 2rem; max-width: 400px; width: 100%;
              box-shadow: 0 8px 32px rgba(0,0,0,0.18);
            }
            .delete-dialog h3 { margin-bottom: 0.75rem; color: #111; }
            .delete-dialog p  { color: #555; font-size: 0.95rem; margin-bottom: 1.5rem; }
            .delete-dialog-actions { display: flex; gap: 0.75rem; }
          `}</style>
          <div className="delete-overlay">
            <div className="delete-dialog">
              <h3>Delete Article?</h3>
              <p>This will soft-delete the article and remove it from public view. You can restore it from the database if needed.</p>
              <div className="delete-dialog-actions">
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, border: "1px solid var(--border)" }}
                  onClick={() => setPendingDelete(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none" }}
                  onClick={confirmDelete}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="admin-container" style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)", fontWeight: "bold" }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        <h1 style={{ marginBottom: "0.25rem" }}>Edit Article</h1>
        <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.9rem" }}>
          Drag images from the Image Bank directly into the editor, or use the Insert button.
        </p>

        <form onSubmit={handleSave} style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
          {/* Editor section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required style={{ fontSize: "1.5rem", padding: "0.75rem" }} />
            </div>
            <div className="form-group">
              <label>URL Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} required style={{ padding: "0.5rem" }} />
            </div>
            <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label>Content</label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                onSetHeaderImage={setHeaderImageUrl}
                imageBank={imageBank}
                setImageBank={setImageBank}
                toast={toast}
                articleSlug={currentArticleSlug}
                editionSlug={currentEditionSlug}
              />
            </div>
          </div>

          {/* Metadata panel */}
          <div style={{ background: "var(--surface)", padding: "1.5rem", border: "1px solid var(--border)" }}>
            <h3 style={{ marginBottom: "1rem" }}>Metadata &amp; Publishing</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Published">Published</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Psychology">Psychology</option>
                  <option value="Environmental Science">Environmental Science</option>
                </select>
              </div>
              <div className="form-group">
                <label>Author</label>
                <select value={authorId} onChange={e => setAuthorId(e.target.value)} required>
                  <option value="">Select Author...</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Edition</label>
                <select value={editionId} onChange={e => setEditionId(e.target.value)} required>
                  <option value="">Select Edition...</option>
                  {editions.map(ed => <option key={ed._id} value={ed._id}>{ed.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Header Image</label>
              {headerImageUrl && (
                <div style={{ position: "relative", marginBottom: "0.5rem", border: "1px solid var(--border)", padding: "0.25rem", width: "230px" }}>
                  <img src={headerImageUrl} alt="Header Preview" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", display: "block" }} />
                  <button
                    type="button"
                    onClick={() => { setHeaderImageUrl(""); toast.info("Header image cleared."); }}
                    style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(220,38,38,0.9)", color: "white", padding: "0.2rem 0.5rem", fontSize: "0.8rem", border: "none", cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const presignRes = await fetch("/api/upload-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      fileName: file.name, 
                      fileType: file.type || "application/octet-stream",
                      articleSlug: currentArticleSlug,
                      editionSlug: currentEditionSlug
                    })
                  });
                  const presignData = await presignRes.json();
                  if (presignData.success) {
                    const uploadRes = await fetch(presignData.presignedUrl, {
                      method: "PUT",
                      headers: { "Content-Type": file.type || "application/octet-stream" },
                      body: file
                    });
                    if (uploadRes.ok) {
                      setHeaderImageUrl(presignData.url);
                      toast.success("Header image uploaded.");
                    } else {
                      toast.error("Upload to storage failed.");
                    }
                  } else {
                    toast.error("Upload failed: " + presignData.error);
                  }
                } catch {
                  toast.error("Upload error.");
                }
                e.target.value = '';
              }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem", width: "100%", fontSize: "1.1rem" }} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Article"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="btn"
              style={{ marginTop: "0.5rem", width: "100%", background: "transparent", color: "#dc2626", border: "1px solid #dc2626" }}
            >
              Delete Article
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
