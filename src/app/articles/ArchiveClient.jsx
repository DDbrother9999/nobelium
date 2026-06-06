"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ArticleCard from "@/components/ArticleCard";
import { Search } from "lucide-react";

const PAGE_SIZE = 9;

function applySearch(articles, query) {
  if (!query) return articles;
  const q = query.toLowerCase();
  const matching = [];
  const rest = [];
  for (const article of articles) {
    if (
      article.subject?.toLowerCase().includes(q) ||
      article.title?.toLowerCase().includes(q) ||
      article.authorId?.name?.toLowerCase().includes(q)
    ) {
      matching.push(article);
    } else {
      rest.push(article);
    }
  }
  return [...matching, ...rest];
}

export default function ArchiveClient({ initialArticles }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const searchParams = useSearchParams();
  const subjectFilter = searchParams.get("subject");

  useEffect(() => setPage(1), [subjectFilter, query]);

  const { primary, secondary } = useMemo(() => {
    const searched = applySearch(initialArticles, query);
    if (!subjectFilter) return { primary: [], secondary: searched };
    return {
      primary: searched.filter(a => a.subject === subjectFilter),
      secondary: searched.filter(a => a.subject !== subjectFilter),
    };
  }, [initialArticles, query, subjectFilter]);

  const visibleSecondary = secondary.slice(0, page * PAGE_SIZE);
  const hasMore = visibleSecondary.length < secondary.length;

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

      {primary.length === 0 && secondary.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
          {subjectFilter
            ? `No articles found for ${subjectFilter}.`
            : "No articles have been published yet."}
        </div>
      ) : (
        <>
          {subjectFilter && (
            <section style={{ marginBottom: "3rem" }}>
              <h2 style={{
                fontFamily: "var(--font-serif)",
                color: "var(--primary)",
                fontSize: "1.5rem",
                borderBottom: "2px solid var(--primary)",
                paddingBottom: "0.5rem",
                marginBottom: "1.5rem",
              }}>
                {subjectFilter}
                <span style={{ fontWeight: 400, fontSize: "1rem", marginLeft: "0.5rem", color: "#666" }}>
                  ({primary.length} article{primary.length !== 1 ? "s" : ""})
                </span>
              </h2>
              {primary.length > 0 ? (
                <div className="article-grid">
                  {primary.map(article => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : (
                <p style={{ color: "#666" }}>No {subjectFilter} articles published yet.</p>
              )}
            </section>
          )}

          {secondary.length > 0 && (
            <section>
              {subjectFilter && (
                <h2 style={{
                  fontFamily: "var(--font-serif)",
                  color: "var(--primary)",
                  fontSize: "1.5rem",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.5rem",
                  marginBottom: "1.5rem",
                }}>
                  All Other Articles
                </h2>
              )}
              <div className="article-grid">
                {visibleSecondary.map(article => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: "2rem" }}>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    style={{
                      padding: "0.6rem 2rem",
                      border: "1px solid var(--primary)",
                      background: "#ffffff",
                      color: "var(--primary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.95rem",
                    }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
