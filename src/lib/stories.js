import { excerpt } from "@/lib/text";
import { formatArticleDate } from "@/lib/dates";

export function toStory(article, excerptLength = 160) {
  return {
    id: String(article._id),
    slug: article.slug,
    title: article.title,
    subject: article.subject,
    image: article.headerImageUrl || "",
    excerpt: excerpt(article.content, excerptLength),
    author: article.authorId ? { id: String(article.authorId._id), name: article.authorId.name } : null,
    date: formatArticleDate(article),
  };
}
