import Link from "next/link";
import BuildInfo from "@/components/BuildInfo";
import { SUBJECTS, subjectHref } from "@/lib/subjects";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-rule" />
      <div className="container footer-grid">
        <div className="element-tile" aria-hidden="true">
          <span className="element-number">102</span>
          <span className="element-symbol">No</span>
          <span className="element-name">Nobelium</span>
          <span className="element-mass">[259]</span>
        </div>
        <div className="footer-about">
          <p className="footer-tagline">The Science Magazine of the Noble and Greenough School</p>
          <p className="footer-text">Other text, placeholder</p>
        </div>
        <div className="footer-column">
          <span className="footer-label">Sections</span>
          {SUBJECTS.map(sub => (
            <Link href={subjectHref(sub)} key={sub} className="footer-link">{sub}</Link>
          ))}
        </div>
        <div className="footer-column">
          <span className="footer-label">Nobelium</span>
          <Link href="/articles" className="footer-link">All Articles</Link>
          <Link href="/staff" className="footer-link">Staff</Link>
          <Link href="/login" className="footer-link">Author login</Link>
        </div>
      </div>
      <div className="container">
        <div className="footer-wordmark" aria-hidden="true">Nobelium</div>
      </div>
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <BuildInfo year={new Date().getFullYear()} />
          <span>Noble and Greenough School · Dedham, MA</span>
        </div>
      </div>
    </footer>
  );
}
