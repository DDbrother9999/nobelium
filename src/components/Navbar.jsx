"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Search, User } from "lucide-react";

export default function Navbar() {
  const subjects = ["Biology", "Chemistry", "Physics", "Computer Science", "Psychology", "Environmental Science"];
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeSubject = pathname === "/articles" ? searchParams.get("subject") : null;

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-top">
          <div className="header-left">
            {/* Space for consistency */}
          </div>
          <div className="header-logo">
            <Link href="/">
              <span className="logo-text">Nobelium</span>
            </Link>
          </div>
          <div className="header-right">
            <Link href="/login" aria-label="Author Login"><User size={22} /></Link>
            <button className="search-btn" aria-label="Search"><Search size={22} /></button>
          </div>
        </div>
        <nav className="header-nav">
          <Link href="/" className="nav-link">Home</Link>
          {subjects.map(sub => (
            <Link
              href={`/articles?subject=${encodeURIComponent(sub)}`}
              key={sub}
              className={`nav-link${activeSubject === sub ? " active" : ""}`}
            >
              {sub}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
