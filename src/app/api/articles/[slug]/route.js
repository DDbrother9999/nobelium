import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import Edition from "@/models/Edition";
import slugify from "slugify";
import { getAuthenticatedUser } from "@/lib/session";
import { canEditArticle, isEditor } from "@/lib/permissions";
import { MAX_FEATURED } from "@/lib/homepage";

const EDITABLE_FIELDS = ["title", "slug", "subject", "content", "headerImageUrl", "imageBank", "authorId", "editionId", "status"];

export async function PUT(request, { params }) {
  try {
    await connectMongo();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Forbidden: Not signed in" }, { status: 403 });
    }

    const { slug } = await params;

    const article = await Article.findOne({ slug });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    if (!canEditArticle(user, article)) {
      return NextResponse.json({ error: "Forbidden: You can't edit this article" }, { status: 403 });
    }

    const input = await request.json();
    const body = Object.fromEntries(EDITABLE_FIELDS.filter(field => field in input).map(field => [field, input[field]]));

    if (!isEditor(user)) {
      if (body.status === "Published" && article.status !== "Published") {
        return NextResponse.json({ error: "Forbidden: Only editors can publish articles" }, { status: 403 });
      }
      if (body.authorId && body.authorId !== article.authorId.toString()) {
        return NextResponse.json({ error: "Forbidden: Only editors can change the author" }, { status: 403 });
      }
    }
    if (body.subject && user.role === "Subject Editor" && !user.managedSubjects.includes(body.subject)) {
      return NextResponse.json({ error: "Forbidden: Cannot change to an unmanaged subject" }, { status: 403 });
    }

    if ("slug" in body) {
      body.slug = slugify(String(body.slug), { lower: true, strict: true });
      if (!body.slug) {
        return NextResponse.json({ error: "The URL slug can't be empty" }, { status: 400 });
      }
      if (body.slug !== article.slug && await Article.exists({ slug: body.slug })) {
        return NextResponse.json({ error: "Another article already uses that URL slug" }, { status: 409 });
      }
    }

    if (body.status && body.status !== "Published") {
      body.isFeatured = false;
      body.isCoverStory = false;
    }
    if (body.status === "Published" && !article.publishedAt) {
      body.publishedAt = new Date();
    }

    const movedKeys = [];
    
    if ((body.slug && body.slug !== article.slug) || (body.editionId && body.editionId !== article.editionId?.toString())) {
      let oldEditionSlug = null;
      if (article.editionId) {
        const oldEdition = await Edition.findById(article.editionId);
        if (oldEdition) oldEditionSlug = oldEdition.slug;
      }
      
      let newEditionSlug = null;
      const targetEditionId = body.editionId || article.editionId?.toString();
      if (targetEditionId) {
        const newEdition = await Edition.findById(targetEditionId);
        if (newEdition) newEditionSlug = newEdition.slug;
      }

      const oldSlug = article.slug;
      const newSlug = body.slug || article.slug;

      const oldPrefix = oldEditionSlug ? `uploads/editions/${oldEditionSlug}/${oldSlug}/` : `uploads/editor/`;
      const newPrefix = newEditionSlug ? `uploads/editions/${newEditionSlug}/${newSlug}/` : `uploads/editor/`;

      if (oldPrefix !== newPrefix) {
        body.content ??= article.content || "";
        body.headerImageUrl ??= article.headerImageUrl || "";
        body.imageBank ??= article.imageBank || [];

        const keys = new Set();
        const baseUrl = R2_PUBLIC_URL.replace(/\/$/, "");
        const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedBaseUrl}/([^"\\s<>'&]+)`, 'g');

        const searchStrings = [body.content, body.headerImageUrl, ...body.imageBank];

        for (const str of searchStrings) {
          let match;
          while ((match = regex.exec(str)) !== null) {
            const key = decodeURIComponent(match[1]);
            if (key.startsWith(oldPrefix)) {
              keys.add(key);
            }
          }
        }

        for (const oldKey of keys) {
          const fileName = oldKey.substring(oldPrefix.length);
          const newKey = newPrefix + fileName;

          try {
            await s3Client.send(new CopyObjectCommand({
              Bucket: R2_BUCKET_NAME,
              CopySource: encodeURI(`${R2_BUCKET_NAME}/${oldKey}`),
              Key: newKey
            }));
          } catch (err) {
            console.error(`Failed to copy ${oldKey} to ${newKey}:`, err);
            continue;
          }

          const oldUrl = `${baseUrl}/${oldKey}`;
          const newUrl = `${baseUrl}/${newKey}`;
          body.content = body.content.replaceAll(oldUrl, newUrl);
          body.headerImageUrl = body.headerImageUrl.replaceAll(oldUrl, newUrl);
          body.imageBank = body.imageBank.map(url => url.replaceAll(oldUrl, newUrl));
          movedKeys.push(oldKey);
        }
      }
    }
    
    const updatedArticle = await Article.findOneAndUpdate(
      { slug },
      { $set: body },
      { new: true }
    );

    if (!updatedArticle) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    for (const oldKey of movedKeys) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: oldKey }));
      } catch (err) {
        console.error(`Failed to delete old image ${oldKey}:`, err);
      }
    }

    return NextResponse.json({ success: true, article: updatedArticle }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error("Save Article Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectMongo();
    const user = await getAuthenticatedUser(request);
    if (user?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only admins can change homepage placement" }, { status: 403 });
    }

    const { slug } = await params;
    const article = await Article.findOne({ slug, isDeleted: { $ne: true } });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    const body = await request.json();
    const update = {};
    if (typeof body.isCoverStory === "boolean") update.isCoverStory = body.isCoverStory;
    if (typeof body.isFeatured === "boolean") update.isFeatured = body.isFeatured;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if ((update.isCoverStory || update.isFeatured) && article.status !== "Published") {
      return NextResponse.json({ error: "Only published articles can be placed on the homepage" }, { status: 400 });
    }

    if (update.isFeatured && update.isCoverStory) {
      return NextResponse.json({ error: "An article can't be both the cover story and featured" }, { status: 400 });
    }

    if (update.isFeatured && !article.isFeatured) {
      if (article.isCoverStory) {
        return NextResponse.json({ error: "The cover story can't also be featured" }, { status: 400 });
      }
      const featuredCount = await Article.countDocuments({
        isFeatured: true,
        isDeleted: { $ne: true },
        status: "Published",
      });
      if (featuredCount >= MAX_FEATURED) {
        return NextResponse.json({ error: `Only ${MAX_FEATURED} articles can be featured. Unfeature one first.` }, { status: 400 });
      }
    }

    if (update.isCoverStory) {
      update.isFeatured = false;
      await Article.updateMany({ _id: { $ne: article._id }, isCoverStory: true }, { $set: { isCoverStory: false } });
    }

    let updatedArticle;
    try {
      updatedArticle = await Article.findByIdAndUpdate(article._id, { $set: update }, { new: true })
        .select("slug isFeatured isCoverStory")
        .lean();
    } catch (error) {
      if (error.code === 11000) {
        return NextResponse.json({ error: "The cover story was changed at the same time. Refresh and try again." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, article: updatedArticle }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error("Homepage Placement Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectMongo();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Forbidden: Not signed in" }, { status: 403 });
    }

    const { slug } = await params;

    const article = await Article.findOne({ slug });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    if (!canEditArticle(user, article)) {
      return NextResponse.json({ error: "Forbidden: You can't delete this article" }, { status: 403 });
    }

    const deletedArticle = await Article.findOneAndUpdate(
      { slug },
      { $set: { isDeleted: true, isFeatured: false, isCoverStory: false } },
      { new: true }
    );

    if (!deletedArticle) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error("Delete Article Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
