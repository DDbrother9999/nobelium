import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import Edition from "@/models/Edition";
import ClientArticleEditor from "@/components/ClientArticleEditor";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }) {
  await connectMongo();
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const article = await Article.findOne({ slug }).lean();
  if (!article) return notFound();

  const users = await User.find({}).sort({ name: 1 }).lean();
  const editions = await Edition.find({}).sort({ createdAt: -1 }).lean();

  const serializedArticle = {
    ...article,
    _id: article._id.toString(),
    authorId: article.authorId?.toString() || "",
    editionId: article.editionId?.toString() || "",
    createdAt: article.createdAt?.toISOString(),
    updatedAt: article.updatedAt?.toISOString(),
  };

  const serializedUsers = users.map(u => ({ _id: u._id.toString(), name: u.name }));
  const serializedEditions = editions.map(e => ({ _id: e._id.toString(), name: e.name, slug: e.slug }));

  return (
    <ClientArticleEditor 
      initialArticle={serializedArticle} 
      users={serializedUsers} 
      editions={serializedEditions} 
    />
  );
}
