<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Nobelium Brand & Design Guidelines

When creating or modifying components for the **Nobelium** web app, you must strictly adhere to the following design rules. The homepage (`src/app/page.js`), header (`Navbar.jsx`), footer (`Footer.jsx`) and staff directory (`src/app/staff/page.js`) are the reference implementation; all color and font tokens live on `:root` in `src/app/globals.css`.

1. **Prioritize Simplicity & Ultra-Clean UI**:
   - Absolutely NO CSS gradients, `backdrop-filter` (glassmorphism), box shadows, or rounded corners (`--radius` is `0px`).
   - Use simple rules and borders: `1px solid var(--rule)` between list items, `1px solid var(--border)` around form boxes, and a `2px solid var(--primary)` underline beneath section titles (e.g., "By subject", "Staff").
   - The only allowed overlay is the flat `rgba(10, 20, 40, 0.55)` scrim on image cards (the Featured cards) so white text stays readable.

2. **Colors**:
   - **Page background** is pure white (`#ffffff`). Never add dark mode `@media (prefers-color-scheme: dark)` configurations.
   - **Nobles Blue** (`#004990`, `var(--primary)`) is the background of the site header, the site footer and the cover story headline panel, with white text on top. It is also the color for kickers (small uppercase subject labels), active tabs, links and section rules on white.
   - **Blue shades** are for the footer only: `var(--nobles-blue-dark)` (`#003a73`) for the bottom bar and `var(--nobles-blue-light)` (`#0a5aa8`) for the oversized "Nobelium" wordmark.
   - **Text**: `var(--ink)` (`#121212`) for headlines and primary text, `var(--ink-muted)` (`#363636`) for excerpts and deks, and `var(--ink-subtle)` (`#5c5c5c`) for bylines, dates and other metadata. Legacy pages may still use `#000000`/`#111111`.
   - **Yellow/Gold** (`#FFD100`, `var(--accent-yellow)`) is for hover and active states, underlines (a 3px `text-decoration-color` underline on headline hover), small uppercase labels on blue backgrounds (e.g., "Cover Story", footer column labels), the Featured card numbers, and the 6px rule at the top of the footer. The homepage **Featured band** is the one section allowed a full yellow background; do not add others.

3. **Typography**:
   - Use `Georgia, serif` (`var(--font-serif)`) for the "Nobelium" masthead and wordmark, all headlines (`h1`–`h4`), the cover story dek, the footer tagline and the Featured card numbers.
   - Use Libre Franklin (`var(--font-sans)`, loaded with `next/font` in `layout.js`) for navigation, labels, bylines, excerpts, buttons and other functional text on redesigned pages. Legacy pages still inherit Inter from `<body>`; move them to `var(--font-sans)` when you redesign them.
   - Kickers and labels are uppercase, 11–13px, weight 700–800, with `0.1em`–`0.12em` letter spacing.

4. **Layout**:
   - Follow a magazine-style edition cover: a full-bleed cover story image with an overlapping blue headline panel, a 3-up grid of secondary stories, the yellow Featured band with four numbered image cards, then interactive "By subject" tabs.
   - Content sits in `.container` (max-width `1200px`, `1.5rem` side padding). Only the cover image, the Featured band and the header/footer bars run full-bleed.
   - The header has no bottom margin; each page owns its own top spacing (e.g., `padding-top: 2rem`).
   - Keep forms (Auth/Admin) contained in simple bordered boxes without background hues.

# Architectural & Development Rules

1. **TipTap Editor Context**:
   - We use `tiptap-extension-resize-image` for image support instead of the default `@tiptap/extension-image` to allow drag-and-drop resizing.
   - The internal node name is `imageResize`. If you need to fetch image attributes (e.g., `editor.getAttributes('imageResize')`), ensure you query for `imageResize` in addition to `image`.
   - The editor is customized with a sticky menu bar and a native file uploader endpoint (`/api/upload-image`) rather than prompting for external URLs.

2. **Database & Article Deletion**:
   - Articles are **soft-deleted** rather than permanently removed. The `Article` Mongoose schema includes an `isDeleted: { type: Boolean, default: false }` flag.
   - All Mongoose queries fetching articles for public viewing (Homepage, Archive) or the Staff MUST exclude deleted articles by using `{ isDeleted: { $ne: true } }`.

3. **Automated HTML Zip Importer**:
   - We support automated article drafting via InDesign HTML exports bundled as a zip file (`/api/articles/import-html-zip/route.js`).
   - The importer extracts images and uploads them directly to Cloudflare R2 (S3), storing the public URLs in the article's `imageBank`.
   - **Crucial**: The parser explicitly sanitizes InDesign's nested `<span>` tags and entirely removes `<figure>` and `<img>` tags to ensure TipTap can cleanly ingest the HTML. Authors can later insert images manually using the Image Bank sidebar.

4. **Production Deployment**:
   - The application runs on a local VM and is managed by PM2 (`pm2 status`).
   - If you make backend or structural changes, always run `npm run build && npx pm2 restart nobelium` to apply them to the live production server.

5. **Toast Notifications instead of Alerts**:
   - NEVER use the native browser `alert()` or `window.alert()` functions for user feedback.
   - Always use the custom toast implementation: import `useToast` and `ToastContainer` from `@/components/useToast`, render `<ToastContainer toasts={toasts} />` within your component, and call `toast.success()`, `toast.error()`, or `toast.info()`.

6. **Code Comments**:
   - Never add extraneous comments. Only when requested should you comment code.

7. **Homepage Placement**:
   - Admins choose the cover story and Featured articles from the admin dashboard, which calls the admin-only `PATCH /api/articles/[slug]` to set `isCoverStory` / `isFeatured`.
   - Only published articles qualify, only one article can be the cover story (enforced by a unique partial index on `isCoverStory`), at most `MAX_FEATURED` (`src/lib/homepage.js`) can be featured, and an article can't be both. Unpublishing or deleting an article clears both flags.
   - The article `PUT` route only accepts the fields listed in `EDITABLE_FIELDS`; never set placement flags through it.

8. **Shared Helpers**:
   - Import the subject list from `src/lib/subjects.js` (`SUBJECTS`) instead of re-declaring it.
   - Use `formatArticleDate` (`src/lib/dates.js`) for article dates and `excerpt` / `htmlToText` (`src/lib/text.js`) for plain-text previews of article HTML.
