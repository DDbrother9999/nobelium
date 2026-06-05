import Link from "next/link";
import { Calendar, User } from "lucide-react";

export default function ArticleCard({ article }) {
  const articleDate = article.publishedAt || (article.editionId && article.editionId.releaseDate) || article.createdAt;

  return (
    <Link href={`/articles/${article.slug}`} className="article-card">
      <div className="card-image" style={{ backgroundImage: `url(${article.headerImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800'})` }}>
        <span className="subject-tag">{article.subject || "Science"}</span>
      </div>
      <div className="card-content">
        <h3>{article.title}</h3>
        <p className="excerpt">
          {article.content?.substring(0, 120).replace(/<[^>]+>/g, '') || "Explore the fascinating world of science in our latest publication."}...
        </p>
        <div className="card-meta">
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <User size={14} /> {article.authorId?.name || "Staff Writer"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={14} /> {articleDate ? new Date(articleDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Draft"}
          </span>
        </div>
      </div>
    </Link>
  );
}
