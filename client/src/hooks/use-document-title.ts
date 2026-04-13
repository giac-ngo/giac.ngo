import { useEffect } from "react";

const BASE_TITLE = "Bodhi Technology Lab";

/**
 * Sets the document title and optionally the meta description for the current page.
 * Title format: "{pageTitle} | Bodhi Technology Lab"
 * Pass empty string for pageTitle to use the base title alone (landing page).
 */
export function useDocumentTitle(pageTitle: string, metaDescription?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${BASE_TITLE}` : `${BASE_TITLE} - White-Label Platform for Buddhist Organizations`;

    if (metaDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", metaDescription);
      }
    }

    // Cleanup: restore base title on unmount (SPA navigation)
    return () => {
      document.title = `${BASE_TITLE} - White-Label Platform for Buddhist Organizations`;
    };
  }, [pageTitle, metaDescription]);
}
