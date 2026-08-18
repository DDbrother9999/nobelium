const errorMessages = {
  unauthorized: "That Google account is not authorized for Nobelium.",
  oauth_config: "Google login is not configured.",
  oauth_state: "The login session expired. Please try again.",
  missing_email: "Google did not return an email address.",
  unverified_email: "Your Google email address must be verified.",
  oauth_failed: "Google login failed. Please try again.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = errorMessages[params?.error] || "";

  return (
    <div className="container" style={{ minHeight: "calc(100vh - 200px)", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", border: "1px solid var(--border)", padding: "3rem 2rem", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "1rem" }}>Author Login</h1>
        <p style={{ marginBottom: "2rem", opacity: 0.8 }}>Sign in with your Google account to access the publishing dashboard.</p>

        {error && <p style={{ color: "#b91c1c", marginBottom: "1.5rem", fontWeight: "bold" }}>{error}</p>}

        <a
          href="/api/auth/google?next=/admin"
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.8rem", fontSize: "1.1rem" }}
        >
          Sign In with Google
        </a>
      </div>
    </div>
  );
}
