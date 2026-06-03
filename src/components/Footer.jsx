import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "4rem 0 2rem", marginTop: "auto", background: "var(--background)" }}>
      <div className="container" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2rem" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--primary)", fontFamily: "var(--font-serif)" }}>Nobelium</h2>
          <p style={{ maxWidth: "300px", lineHeight: "1.6" }}>The News Site of Noble and Greenough School - Science Edition. Empowering student voices in STEM.</p>
        </div>
        <div style={{ display: "flex", gap: "4rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h3 style={{ fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.5, marginBottom: "0.5rem" }}>Explore</h3>
            <Link href="/articles" style={{ fontWeight: 600 }} className="footer-link">All Articles</Link>
            <Link href="/about" style={{ fontWeight: 600 }} className="footer-link">About Us</Link>
          </div>
        </div>
      </div>
      <div className="container" style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--border)", textAlign: "center", opacity: 0.5, fontSize: "0.9rem" }}>
        &copy; {new Date().getFullYear()} Nobelium Online. All rights reserved.
      </div>
    </footer>
  );
}
