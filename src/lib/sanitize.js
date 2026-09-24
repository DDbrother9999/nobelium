import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const DOMPurify = createDOMPurify(new JSDOM("").window);

export function sanitizeArticleHtml(html) {
  return DOMPurify.sanitize(html || "", { ADD_ATTR: ["target"] });
}
