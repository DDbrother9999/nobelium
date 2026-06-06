"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ArticleCard from "@/components/ArticleCard";
import { Search } from "lucide-react";

export default function ArchiveClient({ initialArticles }) {
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();
  const subjectFilter = searchParams.get("subject");

  const articles = useMemo(() => {
    let pool = initialArticles;

    if (subjectFilter) {
      pool = pool.filter(a => a.subject === subjectFilter);
    }

    if (!query) return pool;

    const q = query.toLowerCase();
    const matching = [];
    const rest = [];

    for (const article of pool) {
      const matchSubject = article.subject?.toLowerCase().includes(q);
      const matchTitle = article.title?.toLowerCase().includes(q);
      const matchAuthor = article.authorId?.name?.toLowerCase().includes(q);

      if (matchSubject || matchTitle || matchAuthor) {
        matching.push(article);
      } else {
        rest.push(article);
      }
    }

    return [...matching, ...rest];
  }, [initialArticles, query, subjectFilter]);

  return (
    <>
      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search articles by title, subject, or author..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {initialArticles.length === 0 ? (
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
    </>
  );
}
