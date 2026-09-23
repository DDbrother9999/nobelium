import Link from "next/link";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import Edition from "@/models/Edition";
import HomeSubjectTabs from "@/components/HomeSubjectTabs";
import { SUBJECTS } from "@/lib/subjects";
import { MAX_FEATURED } from "@/lib/homepage";
import { excerpt } from "@/lib/text";
import { formatArticleDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const PUBLISHED = { isDeleted: { $ne: true }, status: "Published" };
const EXCERPT_SOURCE_LENGTH = 4000;

async function findPublished(filter, limit) {
  const articles = await Article.aggregate([
    { $match: { ...PUBLISHED, ...filter } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
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
        isFeatured: 1,
        content: { $substrCP: ["$content", 0, EXCERPT_SOURCE_LENGTH] },
      },
    },
  ]);
  return Article.populate(articles, [
    { path: "authorId", select: "name" },
    { path: "editionId", select: "releaseDate" },
  ]);
}

function toStory(article, excerptLength = 160) {
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

function Byline({ story }) {
  if (!story.author) return <span className="byline">{story.date}</span>;
  return (
    <span className="byline">
      By <Link href={`/personal/${story.author.id}`}>{story.author.name}</Link> · {story.date}
    </span>
  );
}

export default async function Home() {
  await connectMongo();

  const [recent, [coverArticle], featuredArticles, bySubject] = await Promise.all([
    findPublished({}, 12),
    findPublished({ isCoverStory: true }, 1),
    findPublished({ isFeatured: true }, MAX_FEATURED + 1),
    Promise.all(SUBJECTS.map(subject => findPublished({ subject }, 4))),
  ]);

  if (recent.length === 0) {
    return (
      <div className="home">
        <div className="container home-empty">
          <h2>No Articles Yet</h2>
        </div>
      </div>
    );
  }

  const unfeatured = recent.filter(a => !a.isFeatured);
  const leadArticle = coverArticle || unfeatured.find(a => a.headerImageUrl) || unfeatured[0] || recent[0];
  const leadId = String(leadArticle._id);
  const featuredList = featuredArticles.filter(a => String(a._id) !== leadId).slice(0, MAX_FEATURED);
  const placed = new Set([leadId, ...featuredList.map(a => String(a._id))]);
  const secondaryArticles = recent.filter(a => !placed.has(String(a._id))).slice(0, 3);

  const lead = toStory(leadArticle, 220);
  const secondary = secondaryArticles.map(a => toStory(a, 140));
  const featured = featuredList.map(a => toStory(a));
  const sections = SUBJECTS.map((subject, i) => ({ subject, stories: bySubject[i].map(a => toStory(a)) }));

  return (
    <div className="home">
      <section className={`cover${lead.image ? "" : " no-image"}`}>
        {lead.image && (
          <Link href={`/articles/${lead.slug}`}>
            <img src={lead.image} alt={lead.title} className="cover-image" />
          </Link>
        )}
        <div className="cover-frame">
          <div className="cover-panel">
            <span className="cover-kicker">Cover Story · {lead.subject}</span>
            <h1><Link href={`/articles/${lead.slug}`}>{lead.title}</Link></h1>
            <p>{lead.excerpt}</p>
            <Byline story={lead} />
          </div>
        </div>
      </section>

      {secondary.length > 0 && (
        <section className="container secondary-grid">
          {secondary.map(story => (
            <article className="secondary-story" key={story.id}>
              {story.image && (
                <Link href={`/articles/${story.slug}`}>
                  <img src={story.image} alt={story.title} />
                </Link>
              )}
              <span className="kicker">{story.subject}</span>
              <h3><Link href={`/articles/${story.slug}`}>{story.title}</Link></h3>
              <p>{story.excerpt}</p>
            </article>
          ))}
        </section>
      )}

      {featured.length > 0 && (
        <section className="featured-band">
          <div className="container">
            <h2 className="featured-label">Featured</h2>
            <div className="featured-grid">
              {featured.map((story, i) => (
                <Link href={`/articles/${story.slug}`} className="featured-card" key={story.id}>
                  {story.image && <img src={story.image} alt="" />}
                  <span className="featured-number">{String(i + 1).padStart(2, "0")}</span>
                  <div className="featured-text">
                    <h3>{story.title}</h3>
                    <span>{[story.subject, story.author?.name].filter(Boolean).join(" · ")}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <HomeSubjectTabs sections={sections} />
    </div>
  );
}
