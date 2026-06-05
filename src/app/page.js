import Link from "next/link";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import Edition from "@/models/Edition";

export const dynamic = "force-dynamic";

export default async function Home() {
  await connectMongo();
  
  const articles = await Article.find({ isDeleted: { $ne: true }, status: "Published" })
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("authorId")
    .populate("editionId")
    .lean();

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const recentStories = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="container home-container" style={{ paddingBottom: "4rem" }}>
      <div className="left-column">
        <h2 className="section-title">Recent Stories</h2>
        <div className="recent-list">
          {recentStories.length === 0 && <p style={{color: '#666'}}>No recent stories to display.</p>}
          {recentStories.map((story) => (
            <div className="recent-story" key={story.slug}>
              <div className="recent-image">
                <img src={story.headerImageUrl || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400"} alt={story.title} />
              </div>
              <div className="recent-content">
                <h3 style={{ textTransform: "uppercase" }}><Link href={`/articles/${story.slug}`}>{story.title}</Link></h3>
                <div className="meta">
                  <span className="author">
                    {story.authorId && story.authorId._id ? (
                      <Link href={`/personal/${story.authorId._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {story.authorId.name}
                      </Link>
                    ) : (
                      story.authorId?.name || "Staff Writer"
                    )}
                  </span> • {new Date(story.publishedAt || (story.editionId && story.editionId.releaseDate) || story.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="right-column">
        {featuredArticle ? (
          <div className="featured-story">
             <Link href={`/articles/${featuredArticle.slug}`}>
              <div className="featured-image">
                <img src={featuredArticle.headerImageUrl || "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1200"} alt={featuredArticle.title} />
              </div>
              <div className="featured-content">
                <h2>{featuredArticle.title}</h2>
              </div>
            </Link>
          </div>
        ) : (
          <div className="featured-story" style={{ padding: "2rem", textAlign: "center", background: "#f8f9fa", border: "1px dashed var(--border)" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>No Articles Yet</h2>
          </div>
        )}
      </div>
    </div>
  );
}
