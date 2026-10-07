import { Suspense } from "react";
import ArchiveClient from "./ArchiveClient";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import Edition from "@/models/Edition";
import { toStory } from "@/lib/stories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Archive | Nobelium",
};

const EXCERPT_SOURCE_LENGTH = 4000;

export default async function ArticlesArchive() {
  await connectMongo();
  const articles = await Article.aggregate([
    { $match: { isDeleted: { $ne: true }, status: "Published" } },
    {
      $project: {
        title: 1,
        slug: 1,
        subject: 1,
        headerImageUrl: 1,
        authorId: 1,
        editionId: 1,
        publishedAt: 1,
        createdAt: 1,
        content: { $substrCP: ["$content", 0, EXCERPT_SOURCE_LENGTH] },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
  await Article.populate(articles, [
    { path: "authorId", select: "name" },
    { path: "editionId", select: "name slug releaseDate" },
  ]);

  const displayDate = article => new Date(article.publishedAt || article.editionId?.releaseDate || article.createdAt);
  articles.sort((a, b) => displayDate(b) - displayDate(a));

  const stories = articles.map(article => ({
    ...toStory(article, 180),
    edition: article.editionId ? { slug: article.editionId.slug, name: article.editionId.name } : null,
  }));

  const authorsById = new Map();
  const editionsBySlug = new Map();
  for (const article of articles) {
    if (article.authorId) authorsById.set(String(article.authorId._id), article.authorId.name);
    if (article.editionId) editionsBySlug.set(article.editionId.slug, article.editionId);
  }

  const authors = [...authorsById]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const editions = [...editionsBySlug.values()]
    .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
    .map(edition => ({ slug: edition.slug, name: edition.name }));

  return (
    <div className="container archive">
      <h1 className="archive-title">Archive</h1>
      <Suspense fallback={null}>
        <ArchiveClient stories={stories} authors={authors} editions={editions} />
      </Suspense>
    </div>
  );
}
