import ArchiveClient from "./ArchiveClient";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import Edition from "@/models/Edition";

export const dynamic = "force-dynamic";

export default async function ArticlesArchive() {
  await connectMongo();
  const articles = await Article.find({ isDeleted: { $ne: true }, status: "Published" })
    .sort({ createdAt: -1 })
    .populate("authorId")
    .populate("editionId")
    .lean();

  return (
    <div className="container" style={{ padding: "4rem 1.5rem" }}>
      <div style={{ marginBottom: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", color: "var(--primary)" }}>Article Archive</h1>
        <p style={{ fontSize: "1.1rem" }}>Explore all publications across our scientific disciplines.</p>
      </div>

      <ArchiveClient initialArticles={JSON.parse(JSON.stringify(articles))} />
    </div>
  );
}
