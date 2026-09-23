"use client";

import { useState } from "react";
import Link from "next/link";
import { subjectHref } from "@/lib/subjects";

export default function HomeSubjectTabs({ sections }) {
  const [active, setActive] = useState(
    (sections.find(s => s.stories.length > 0) || sections[0]).subject
  );
  const section = sections.find(s => s.subject === active);
  const [lead, ...rest] = section.stories;

  return (
    <section className="container subject-tabs">
      <div className="subject-tabs-bar">
        <h2 className="subject-tabs-title">By subject</h2>
        <div role="tablist" className="subject-tabs-list">
          {sections.map(({ subject }) => (
            <button
              type="button"
              role="tab"
              key={subject}
              aria-selected={subject === active}
              className={`subject-tab${subject === active ? " active" : ""}`}
              onClick={() => setActive(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {lead ? (
        <div role="tabpanel" className="subject-panel">
          <div className={`subject-lead${lead.image ? "" : " no-image"}`}>
            {lead.image && (
              <Link href={`/articles/${lead.slug}`}>
                <img src={lead.image} alt={lead.title} />
              </Link>
            )}
            <div className="subject-lead-text">
              <span className="kicker">{section.subject}</span>
              <h3><Link href={`/articles/${lead.slug}`}>{lead.title}</Link></h3>
              <p>{lead.excerpt}</p>
              {lead.author && (
                <span className="byline">
                  By <Link href={`/personal/${lead.author.id}`}>{lead.author.name}</Link>
                </span>
              )}
            </div>
          </div>
          <div className="subject-list">
            {rest.map(story => (
              <div className={`subject-row${story.image ? "" : " no-image"}`} key={story.id}>
                <div className="subject-row-text">
                  <h4><Link href={`/articles/${story.slug}`}>{story.title}</Link></h4>
                  <span className="byline">
                    {[story.author?.name, story.date].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {story.image && (
                  <Link href={`/articles/${story.slug}`}>
                    <img src={story.image} alt={story.title} />
                  </Link>
                )}
              </div>
            ))}
            <Link href={subjectHref(section.subject)} className="subject-all">
              All {section.subject} stories →
            </Link>
          </div>
        </div>
      ) : (
        <p role="tabpanel" className="subject-empty">No {section.subject} stories yet.</p>
      )}
    </section>
  );
}
