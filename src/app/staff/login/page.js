const errorMessages = {
  unauthorized: "That Google account is not authorized for Nobelium.",
  oauth_config: "Google login is not configured.",
  oauth_state: "The login session expired. Please try again.",
  missing_email: "Google did not return an email address.",
  unverified_email: "Your Google email address must be verified.",
  oauth_failed: "Google login failed. Please try again.",
};

export default async function StaffLogin({ searchParams }) {
  const params = await searchParams;
  const error = errorMessages[params?.error] || "";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", background: "#ffffff" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "2rem", border: "1px solid var(--border)" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--primary)", textAlign: "center", marginBottom: "1rem" }}>
          Staff Login
        </h1>
        <p style={{ textAlign: "center", marginBottom: "2rem", fontSize: "0.9rem", color: "#000000" }}>
          Sign in using your authorized Google account.
        </p>

        {error && <p style={{ color: "#b91c1c", marginBottom: "1.5rem", fontWeight: "bold", textAlign: "center" }}>{error}</p>}

        <a
          href="/api/auth/google?next=/staff/dashboard"
          style={{
            display: "block",
            width: "100%",
            padding: "0.75rem",
            background: "var(--primary)",
            color: "#ffffff",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
