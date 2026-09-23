"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { Search, User } from "lucide-react";
import { SUBJECTS, subjectHref } from "@/lib/subjects";

function ActiveSubjectLinks() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeSubject = pathname === "/articles" ? searchParams.get("subject") : null;

  return (
    <>
      {SUBJECTS.map(sub => (
        <Link
          href={subjectHref(sub)}
          key={sub}
          className={`nav-link${activeSubject === sub ? " active" : ""}`}
        >
          {sub}
        </Link>
      ))}
    </>
  );
}

function StaticSubjectLinks() {
  return (
    <>
      {SUBJECTS.map(sub => (
        <Link href={subjectHref(sub)} key={sub} className="nav-link">
          {sub}
        </Link>
      ))}
    </>
  );
}

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="container header-bar">
        <Link href="/" className="logo-text">Nobelium</Link>
        <nav className="header-nav">
          <Suspense fallback={<StaticSubjectLinks />}>
            <ActiveSubjectLinks />
          </Suspense>
        </nav>
        <div className="header-actions">
          <button className="search-btn" aria-label="Search"><Search size={20} /></button>
          <Link href="/login" aria-label="Author Login"><User size={20} /></Link>
        </div>
      </div>
    </header>
  );
}
