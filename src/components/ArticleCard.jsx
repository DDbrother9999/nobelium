"use client";

import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ArticleCard({ article }) {
  const router = useRouter();
  const articleDate = article.publishedAt || (article.editionId && article.editionId.releaseDate) || article.createdAt;

  return (
    <div 
      className="article-card" 
      onClick={() => router.push(`/articles/${article.slug}`)}
      style={{ cursor: "pointer", position: "relative" }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/articles/${article.slug}`);
      }}
    >
      <div className="card-image" style={{ backgroundImage: `url(${article.headerImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800'})` }}>
        <span className="subject-tag">{article.subject || "Science"}</span>
      </div>
      <div className="card-content">
        <h3>
          <Link href={`/articles/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
            {article.title}
          </Link>
        </h3>
        <p className="excerpt">
          {article.content?.substring(0, 120).replace(/<[^>]+>/g, '') || "Explore the fascinating world of science in our latest publication."}...
        </p>
        <div className="card-meta">
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <User size={14} /> 
            {article.authorId && article.authorId._id ? (
              <Link 
                href={`/personal/${article.authorId._id}`} 
                onClick={(e) => e.stopPropagation()}
                className="author-link"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ textDecoration: 'underline' }}>{article.authorId.name}</span>
              </Link>
            ) : (
              article.authorId?.name || "Staff Writer"
            )}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={14} /> {articleDate ? new Date(articleDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Draft"}
          </span>
        </div>
      </div>
    </div>
  );
}
