"use client";

import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ArticleCard({ story }) {
  const router = useRouter();
  const subject = story.subject || "Science";
  const href = `/articles/${story.slug}`;

  return (
    <div
      className="article-card"
      onClick={() => router.push(href)}
      style={{ cursor: "pointer", position: "relative" }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
    >
      {story.image && (
        <div className="card-image" style={{ backgroundImage: `url(${story.image})` }}>
          <span className="subject-tag">{subject}</span>
        </div>
      )}
      <div className="card-content">
        {!story.image && (
          <span className="subject-tag" style={{ position: "static", alignSelf: "flex-start", marginBottom: "0.75rem" }}>{subject}</span>
        )}
        <h3>
          <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
            {story.title}
          </Link>
        </h3>
        <p className="excerpt">{story.excerpt}</p>
        <div className="card-meta">
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <User size={14} />
            {story.author ? (
              <Link
                href={`/personal/${story.author.id}`}
                onClick={(e) => e.stopPropagation()}
                className="author-link"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ textDecoration: 'underline' }}>{story.author.name}</span>
              </Link>
            ) : (
              "Staff Writer"
            )}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={14} /> {story.date}
          </span>
        </div>
      </div>
    </div>
  );
}
