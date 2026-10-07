"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 200;

function updateUrl(update) {
  const params = new URLSearchParams(window.location.search);
  update(params);
  const search = params.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

function setParam(key, value) {
  updateUrl(params => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
}

function searchText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

function matchesQuery(story, words) {
  const text = searchText(`${story.title} ${story.subject}`);
  return words.every(word => text.includes(word));
}

export default function ArchiveClient({ stories, authors, editions }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const selectedSubjects = searchParams.getAll("subject").filter(subject => SUBJECTS.includes(subject));
  const authorParam = searchParams.get("author");
  const editionParam = searchParams.get("edition");
  const author = authors.find(a => a.id === authorParam);
  const edition = editions.find(e => e.slug === editionParam);
  const focusSearch = searchParams.get("focus") === "search";

  const inputRef = useRef(null);
  const searchTimer = useRef(null);
  const [moreOpen, setMoreOpen] = useState(Boolean(author || edition));

  const filterKey = searchParams.toString();
  const [shown, setShown] = useState({ filterKey, count: PAGE_SIZE });
  const shownCount = shown.filterKey === filterKey ? shown.count : PAGE_SIZE;

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) inputRef.current.value = query;
  }, [query]);

  useEffect(() => {
    if (!focusSearch) return;
    inputRef.current.focus();
    setParam("focus", "");
  }, [focusSearch]);

  useEffect(() => {
    if (authorParam && !author) setParam("author", "");
    if (editionParam && !edition) setParam("edition", "");
  }, [authorParam, author, editionParam, edition]);

  const words = searchText(query).split(/\s+/).filter(Boolean);
  const matching = stories.filter(story =>
    matchesQuery(story, words) &&
    (!author || story.author?.id === author.id) &&
    (!edition || story.edition?.slug === edition.slug)
  );
  const results = selectedSubjects.length > 0
    ? matching.filter(story => selectedSubjects.includes(story.subject))
    : matching;
  const visible = results.slice(0, shownCount);

  const subjectCounts = {};
  for (const story of matching) {
    subjectCounts[story.subject] = (subjectCounts[story.subject] || 0) + 1;
  }

  const normalizedQuery = searchText(query);
  const authorSuggestions = query.length >= 2 && !author
    ? authors.filter(a => searchText(a.name).includes(normalizedQuery)).slice(0, 3)
    : [];
  const editionSuggestions = query.length >= 2 && !edition
    ? editions.filter(e => searchText(e.name).includes(normalizedQuery)).slice(0, 2)
    : [];

  const advancedCount = (author ? 1 : 0) + (edition ? 1 : 0);
  const hasFilters = Boolean(query) || selectedSubjects.length > 0 || advancedCount > 0;

  function writeQuery(value) {
    clearTimeout(searchTimer.current);
    setParam("q", value.trim());
  }

  function handleQueryChange(e) {
    const value = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => writeQuery(value), SEARCH_DELAY_MS);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    writeQuery(inputRef.current.value);
    if (window.matchMedia("(pointer: coarse)").matches) inputRef.current.blur();
  }

  function toggleSubject(subject) {
    updateUrl(params => {
      const current = params.getAll("subject");
      const next = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      params.delete("subject");
      SUBJECTS.filter(s => next.includes(s)).forEach(s => params.append("subject", s));
    });
  }

  function applySuggestion(key, value) {
    clearTimeout(searchTimer.current);
    inputRef.current.value = "";
    updateUrl(params => {
      params.delete("q");
      params.set(key, value);
    });
    setMoreOpen(true);
  }

  function clearAll() {
    clearTimeout(searchTimer.current);
    inputRef.current.value = "";
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <>
      <form className="archive-search" role="search" onSubmit={handleSearchSubmit}>
        <div className="archive-search-box">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            id="archive-search"
            type="search"
            defaultValue={query}
            placeholder="Search by title or subject"
            aria-label="Search articles by title or subject"
            autoComplete="off"
            onChange={handleQueryChange}
            onBlur={e => writeQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="archive-more-btn"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(open => !open)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span className="hide-mobile">More filters</span>
          <span className="hide-desktop">Filters</span>
          {advancedCount > 0 && <span className="archive-more-count">{advancedCount}</span>}
        </button>
      </form>

      <div className="archive-subjects" role="group" aria-label="Filter by subject">
        <button
          type="button"
          className="filter-chip"
          aria-pressed={selectedSubjects.length === 0}
          onClick={() => setParam("subject", "")}
        >
          All subjects
        </button>
        {SUBJECTS.map(subject => {
          const selected = selectedSubjects.includes(subject);
          return (
            <button
              type="button"
              key={subject}
              className="filter-chip"
              aria-pressed={selected}
              onClick={() => toggleSubject(subject)}
            >
              {selected && <Check size={14} aria-hidden="true" />}
              {subject}
              <span className="filter-chip-count">{subjectCounts[subject] || 0}</span>
            </button>
          );
        })}
      </div>

      {moreOpen && (
        <div className="archive-more">
          <label className="archive-field">
            <span>Author</span>
            <div className="archive-select">
              <select value={author?.id || ""} onChange={e => setParam("author", e.target.value)}>
                <option value="">All authors</option>
                {authors.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </label>
          <label className="archive-field">
            <span>Edition</span>
            <div className="archive-select">
              <select value={edition?.slug || ""} onChange={e => setParam("edition", e.target.value)}>
                <option value="">All editions</option>
                {editions.map(option => (
                  <option key={option.slug} value={option.slug}>{option.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </label>
        </div>
      )}

      {(authorSuggestions.length > 0 || editionSuggestions.length > 0) && (
        <div className="archive-suggest">
          <span>Filter by</span>
          {authorSuggestions.map(match => (
            <button type="button" key={match.id} onClick={() => applySuggestion("author", match.id)}>
              Author: {match.name}
            </button>
          ))}
          {editionSuggestions.map(match => (
            <button type="button" key={match.slug} onClick={() => applySuggestion("edition", match.slug)}>
              Edition: {match.name}
            </button>
          ))}
        </div>
      )}

      <div className="archive-summary">
        <p className="archive-count" aria-live="polite">
          {results.length} {results.length === 1 ? "article" : "articles"}
        </p>
        {author && (
          <button
            type="button"
            className="active-filter"
            aria-label={`Remove author filter: ${author.name}`}
            onClick={() => setParam("author", "")}
          >
            Author: {author.name} <X size={14} aria-hidden="true" />
          </button>
        )}
        {edition && (
          <button
            type="button"
            className="active-filter"
            aria-label={`Remove edition filter: ${edition.name}`}
            onClick={() => setParam("edition", "")}
          >
            Edition: {edition.name} <X size={14} aria-hidden="true" />
          </button>
        )}
        {hasFilters && (
          <button type="button" className="archive-clear" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="archive-empty">
          {stories.length === 0 ? "No articles have been published yet." : "No articles match these filters."}
        </p>
      ) : (
        <>
          <ul className="archive-results">
            {visible.map(story => (
              <li className={`archive-row${story.image ? "" : " no-image"}`} key={story.id}>
                <div className="archive-row-text">
                  <span className="kicker">{story.subject}</span>
                  <h2><Link href={`/articles/${story.slug}`}>{story.title}</Link></h2>
                  {story.excerpt && <p>{story.excerpt}</p>}
                  <span className="byline">
                    {story.author && (
                      <>By <Link href={`/personal/${story.author.id}`}>{story.author.name}</Link> · </>
                    )}
                    {[story.date, story.edition?.name].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {story.image && (
                  <Link href={`/articles/${story.slug}`} tabIndex={-1} aria-hidden="true">
                    <img src={story.image} alt="" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {visible.length < results.length && (
            <button
              type="button"
              className="archive-load-more"
              onClick={() => setShown({ filterKey, count: shownCount + PAGE_SIZE })}
            >
              Load more
            </button>
          )}
        </>
      )}
    </>
  );
}
