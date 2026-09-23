"use client";

import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatArticleDate } from "@/lib/dates";

export default function ArticleCard({ article }) {
  const router = useRouter();

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
      {article.headerImageUrl && (
        <div className="card-image" style={{ backgroundImage: `url(${article.headerImageUrl})` }}>
          <span className="subject-tag">{article.subject || "Science"}</span>
        </div>
      )}
      <div className="card-content">
        {!article.headerImageUrl && (
          <span className="subject-tag" style={{ position: "static", alignSelf: "flex-start", marginBottom: "0.75rem" }}>{article.subject || "Science"}</span>
        )}
        <h3>
          <Link href={`/articles/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
            {article.title}
          </Link>
        </h3>
        <p className="excerpt">
          {article.content && `${article.content.substring(0, 120).replace(/<[^>]+>/g, '')}...`}
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
            <Calendar size={14} /> {formatArticleDate(article) || "Draft"}
          </span>
        </div>
      </div>
    </div>
  );
}
