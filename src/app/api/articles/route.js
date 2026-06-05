import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import User from "@/models/User";
import slugify from "slugify";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(request) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    await connectMongo();
    const user = await User.findOne({ firebaseUid: decodedClaims.uid });
    
    if (!user || !["Admin", "Subject Editor", "Staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    let query = { isDeleted: { $ne: true } };
    
    // Filter articles based on role
    if (user.role === "Subject Editor") {
      query.subject = { $in: user.managedSubjects || [] };
    } else if (user.role === "Staff") {
      query.authorId = user._id;
    } // Admins can see all non-deleted articles

    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .select("title slug status subject editionId createdAt updatedAt authorId")
      .lean();

    return NextResponse.json({
      articles: articles.map(article => ({
        ...article,
        _id: article._id.toString(),
        authorId: article.authorId?.toString() || "",
        editionId: article.editionId?.toString() || "",
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await adminAuth.verifySessionCookie(session);

    await connectMongo();
    const user = await User.findOne({ firebaseUid: decodedClaims.uid });
    if (!user) return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    if (!["Admin", "Subject Editor", "Staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    const body = await request.json();
    const title = body.title?.trim() || "Untitled Draft";
    const subject = body.subject || "Biology";

    if (user.role === "Subject Editor" && (!user.managedSubjects || !user.managedSubjects.includes(subject))) {
      return NextResponse.json({ error: "Forbidden: Not assigned to this subject" }, { status: 403 });
    }
    const editionId = body.editionId || undefined;
    let baseSlug = slugify(title, { lower: true, strict: true }) || "untitled-draft";
    let slug = baseSlug;
    let counter = 1;
    while (await Article.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const article = await Article.create({
      title,
      slug,
      content: "<p></p>",
      subject,
      authorId: user._id,
      editionId,
      status: "Draft",
      headerImageUrl: "",
      imageBank: [],
    });

    return NextResponse.json({ success: true, articleSlug: article.slug });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
