WHAT I TRIED — FULL REVIEWED MULTI-PAGE STATIC WEBSITE

PREVIEW
1. Open this entire folder in VS Code.
2. Start Live Server from index.html.
3. Open the local URL shown by VS Code.

OWNER ADMIN
Path: admin/restaurants/index.html
Passcode: Krishnateja@

ADMIN FEATURES
- Add restaurant
- Edit restaurant
- Delete restaurant
- Edit city, categories, rating, recommendation, review, image and dishes
- View contact submissions stored on this browser
- Export the current edited data as JSON
- Reset browser edits

HOW EDITS APPEAR
Admin edits are saved to localStorage and are read by every public page on the same browser and website origin. Refresh the public page after saving an edit. Live Server, Netlify and GitHub Pages provide a shared origin. Opening separate HTML files directly with file:// may not share localStorage consistently in every browser.

IMPORTANT STATIC-SITE LIMITS
- Changes made in Owner Admin are local to that browser/device. They are not automatically published to every visitor.
- Contact submissions are local to the visitor's browser unless a real form backend is connected.
- The passcode gate is client-side and cannot provide server-level security.
- For global admin updates and private authentication, connect a database/backend or use the full Next.js version.

IMAGE FIXES
- Amro Café has a bundled local editorial image.
- Forge has a bundled local editorial image.
- Every remote image has a bundled fallback so blank image areas are avoided.

GITHUB PAGES
Upload the contents of this folder so index.html is at the repository root. The included .nojekyll file keeps GitHub Pages from processing assets through Jekyll.
