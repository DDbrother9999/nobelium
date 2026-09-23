const SCHOOL_TIME_ZONE = "America/New_York";

export function formatArticleDate(article, month = "short") {
  const releaseDate = article.editionId?.releaseDate;
  const date = article.publishedAt || releaseDate || article.createdAt;
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: "numeric",
    timeZone: !article.publishedAt && releaseDate ? "UTC" : SCHOOL_TIME_ZONE,
  });
}
