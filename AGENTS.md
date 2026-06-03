<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Nobelium Brand & Design Guidelines

When creating or modifying components for the **Nobelium** web app, you must strictly adhere to the following design rules:

1. **Prioritize Simplicity & Ultra-Clean UI**:
   - Absolutely NO complex CSS gradients, `backdrop-filter` (glassmorphism), heavy box shadows, or overly stylized wrappers.
   - Use simple borders (`1px solid var(--border)`) and standard margins.
   
2. **Colors**:
   - **Backgrounds MUST be pure white** (`#ffffff`). Remove any dark mode `@media (prefers-color-scheme: dark)` configurations if they appear. 
   - **Text**: Use black (`#000000` or `#111111`) for normal text and paragraphs. 
   - **Headers/Links**: Use Nobles Blue (`#004990` or `var(--primary)`).
   - **Accents**: Use Yellow/Gold (`#FFD100` or `var(--accent-yellow)`) exclusively for hover effects, active states, or minor decorative underlines.

3. **Typography**:
   - Use `Georgia, serif` (`var(--font-serif)`) for the publication title (Nobelium), large headers (`h1`, `h2`, `h3`), and featured article titles.
   - Use standard sans-serif (e.g., system UI fonts) for body paragraphs and functional text.

4. **Layout**:
   - Strive to mirror traditional online newspaper layouts (e.g., The Nobleman). 
   - Keep forms (Auth/Admin) contained in simple boxed wrappers without background hues.

# Architectural & Development Rules

1. **TipTap Editor Context**:
   - We use `tiptap-extension-resize-image` for image support instead of the default `@tiptap/extension-image` to allow drag-and-drop resizing.
   - The internal node name is `imageResize`. If you need to fetch image attributes (e.g., `editor.getAttributes('imageResize')`), ensure you query for `imageResize` in addition to `image`.
   - The editor is customized with a sticky menu bar and a native file uploader endpoint (`/api/upload-image`) rather than prompting for external URLs.

2. **Database & Article Deletion**:
   - Articles are **soft-deleted** rather than permanently removed. The `Article` Mongoose schema includes an `isDeleted: { type: Boolean, default: false }` flag.
   - All Mongoose queries fetching articles for public viewing (Homepage, Archive) or the Admin Dashboard MUST exclude deleted articles by using `{ isDeleted: { $ne: true } }`.

3. **Automated EPUB Importer**:
   - We support automated article drafting via InDesign EPUB imports (`/api/articles/import-epub/route.js`).
   - The importer extracts images locally and rewrites the HTML `<img>` tags.
   - **Crucial**: The parser explicitly sanitizes InDesign's nested `<span>` tags, removes absolute `<style>` positioning, and handles URL-encoded file names to ensure TipTap can cleanly ingest the HTML without stripping links and images.

4. **Production Deployment**:
   - The application runs on a local VM and is managed by PM2 (`pm2 status`).
   - If you make backend or structural changes, always run `npm run build && npx pm2 restart nobelium` to apply them to the live production server.
