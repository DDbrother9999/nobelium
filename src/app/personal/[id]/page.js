import ArticleCard from "@/components/ArticleCard";
import { User as UserIcon } from "lucide-react";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import Article from "@/models/Article";
import Edition from "@/models/Edition";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthorProfile({ params }) {
  await connectMongo();
  const resolvedParams = await params;

  let author;
  try {
    author = await User.findById(resolvedParams.id).lean();
  } catch (error) {
    return notFound();
  }

  if (!author) {
    return notFound();
  }

  const articles = await Article.find({ authorId: author._id, status: "Published", isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate("authorId")
    .populate("editionId")
    .lean();

  return (
    <div className="container" style={{ padding: "4rem 1.5rem", backgroundColor: "#ffffff" }}>
      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", marginBottom: "4rem", borderBottom: "1px solid var(--border)", paddingBottom: "2rem" }}>
        <div style={{ flexShrink: 0 }}>
          {author.avatarUrl ? (
            <img 
              src={author.avatarUrl} 
              alt={author.name} 
              style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} 
            />
          ) : (
            <div style={{ width: "120px", height: "120px", borderRadius: "50%", backgroundColor: "#ffffff", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserIcon size={48} color="#111111" />
            </div>
          )}
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", color: "var(--primary)", margin: "0 0 0.5rem 0" }}>
            {author.name}
          </h1>
          <span style={{ display: "inline-block", backgroundColor: "var(--primary)", color: "#ffffff", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "1rem" }}>
            {author.role}
          </span>
          <p style={{ margin: 0, color: "#111111", lineHeight: "1.6", fontSize: "1.1rem" }}>
            {author.bio || "Author at The Nobleman."}
          </p>
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", marginBottom: "2rem", color: "#111111" }}>
          Articles by {author.name}
        </h2>
        
        {articles.length === 0 ? (
          <p style={{ color: "#666", fontSize: "1.1rem" }}>No published articles yet.</p>
        ) : (
          <div className="article-grid">
            {articles.map(article => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
