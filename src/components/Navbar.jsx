"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Menu, Search, User, X } from "lucide-react";
import { SUBJECTS, subjectHref } from "@/lib/subjects";

function SubjectLinks({ className, activeSubject = null, onClick }) {
  return (
    <>
      {SUBJECTS.map(sub => (
        <Link
          href={subjectHref(sub)}
          key={sub}
          className={`${className}${activeSubject === sub ? " active" : ""}`}
          onClick={onClick}
        >
          {sub}
        </Link>
      ))}
    </>
  );
}

function ActiveSubjectLinks({ className }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeSubject = pathname === "/articles" ? searchParams.get("subject") : null;
  return <SubjectLinks className={className} activeSubject={activeSubject} />;
}

function HeaderBar({ onLogoClick, children }) {
  return (
    <div className="container header-bar">
      <Link href="/" className="logo-text" onClick={onLogoClick}>Nobelium</Link>
      {children}
    </div>
  );
}

function SiteMenu({ searchRef, onClose }) {
  const router = useRouter();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    if (!dialog.contains(document.activeElement)) closeRef.current.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialog.querySelectorAll("a[href], button, input");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const onDesktop = (e) => {
      if (e.matches) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    window.addEventListener("popstate", onClose);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
      window.removeEventListener("popstate", onClose);
    };
  }, [onClose]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchRef.current.value.trim();
    onClose();
    router.push(query ? `/articles?q=${encodeURIComponent(query)}` : "/articles");
  };

  return (
    <div ref={dialogRef} className="site-menu hide-desktop" id="site-menu" role="dialog" aria-modal="true" aria-label="Menu">
      <HeaderBar onLogoClick={onClose}>
        <div className="header-actions">
          <button type="button" ref={closeRef} className="icon-btn" aria-label="Close menu" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
      </HeaderBar>
      <div className="site-menu-rule" />
      <div className="container site-menu-body">
        <form className="site-menu-search" role="search" onSubmit={handleSearch}>
          <Search size={18} aria-hidden="true" />
          <input ref={searchRef} type="search" name="q" placeholder="Search articles" aria-label="Search articles" />
        </form>
        <span className="site-menu-label">Sections</span>
        <SubjectLinks className="site-menu-subject" onClick={onClose} />
        <div className="site-menu-links">
          <Link href="/articles" onClick={onClose}>All Articles</Link>
          <Link href="/staff" onClick={onClose}>Staff</Link>
          <Link href="/login" onClick={onClose}><User size={18} aria-hidden="true" />Author login</Link>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openerRef = useRef(null);
  const searchRef = useRef(null);

  const openMenu = (e, focusSearch) => {
    openerRef.current = e.currentTarget;
    flushSync(() => setMenuOpen(true));
    if (focusSearch) searchRef.current?.focus();
  };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    openerRef.current?.focus();
  }, []);

  return (
    <>
      <header className="site-header">
        <HeaderBar>
          <nav className="header-nav">
            <Suspense fallback={<SubjectLinks className="nav-link" />}>
              <ActiveSubjectLinks className="nav-link" />
            </Suspense>
          </nav>
          <div className="header-actions">
            <Link href="/articles#search" className="icon-btn hide-mobile" aria-label="Search"><Search size={20} /></Link>
            <Link href="/login" className="icon-btn hide-mobile" aria-label="Author Login"><User size={20} /></Link>
            <button type="button" className="icon-btn hide-desktop" aria-label="Search" onClick={e => openMenu(e, true)}>
              <Search size={20} />
            </button>
            <button
              type="button"
              className="icon-btn hide-desktop"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={e => openMenu(e, false)}
            >
              <Menu size={22} />
            </button>
          </div>
        </HeaderBar>
      </header>
      <nav className="subject-strip hide-desktop" aria-label="Sections">
        <Suspense fallback={<SubjectLinks className="strip-link" />}>
          <ActiveSubjectLinks className="strip-link" />
        </Suspense>
      </nav>
      {menuOpen && <SiteMenu searchRef={searchRef} onClose={closeMenu} />}
    </>
  );
}
