import ArticleCard from "@/components/ArticleCard";
import { Search } from "lucide-react";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import Edition from "@/models/Edition";

export const dynamic = "force-dynamic";

export default async function ArticlesArchive() {
  await connectMongo();
  const articles = await Article.find({ isDeleted: { $ne: true }, status: "Published" })
    .sort({ createdAt: -1 })
    .populate("authorId")
    .populate("editionId")
    .lean();

  return (
    <div className="container" style={{ padding: "4rem 1.5rem" }}>
      <div style={{ marginBottom: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", color: "var(--primary)" }}>Article Archive</h1>
        <p style={{ fontSize: "1.1rem" }}>Explore all publications across our scientific disciplines.</p>
      </div>

      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input type="text" placeholder="Search articles by title, subject, or author..." />
      </div>

      {articles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
          No articles have been published yet.
        </div>
      ) : (
        <div className="article-grid">
          {articles.map(article => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
