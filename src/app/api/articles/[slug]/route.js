import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import Edition from "@/models/Edition";
import { getAuthenticatedUser } from "@/lib/session";

export async function PUT(request, { params }) {
  try {
    await connectMongo();
    const user = await getAuthenticatedUser(request);
    if (!["Admin", "Subject Editor", "Staff"].includes(user?.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { slug } = resolvedParams;

    const article = await Article.findOne({ slug });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    if (user.role === "Subject Editor" && (!user.managedSubjects || !user.managedSubjects.includes(article.subject))) {
      return NextResponse.json({ error: "Forbidden: Not assigned to this article's subject" }, { status: 403 });
    }
    if (user.role === "Staff" && article.authorId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own articles" }, { status: 403 });
    }

    const body = await request.json();
    if (body.subject && user.role === "Subject Editor" && !user.managedSubjects.includes(body.subject)) {
      return NextResponse.json({ error: "Forbidden: Cannot change to an unmanaged subject" }, { status: 403 });
    }
    
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
        const keys = new Set();
        const baseUrl = R2_PUBLIC_URL.replace(/\/$/, "");
        const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedBaseUrl}/([^"\\s<>'&]+)`, 'g');
        
        const searchStrings = [
          body.content !== undefined ? body.content : (article.content || ""),
          body.headerImageUrl !== undefined ? body.headerImageUrl : (article.headerImageUrl || ""),
          ...(body.imageBank !== undefined ? body.imageBank : (article.imageBank || []))
        ];

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
            await s3Client.send(new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: oldKey
            }));

            const oldUrl = `${baseUrl}/${oldKey}`;
            const newUrl = `${baseUrl}/${newKey}`;
            
            body.content = (body.content !== undefined ? body.content : article.content).replaceAll(oldUrl, newUrl);
            
            if (body.headerImageUrl !== undefined || article.headerImageUrl) {
              body.headerImageUrl = (body.headerImageUrl !== undefined ? body.headerImageUrl : article.headerImageUrl).replaceAll(oldUrl, newUrl);
            }
            
            if (body.imageBank !== undefined || article.imageBank) {
              const currentBank = body.imageBank !== undefined ? body.imageBank : article.imageBank;
              if (currentBank) {
                body.imageBank = currentBank.map(url => url.replaceAll(oldUrl, newUrl));
              }
            }
          } catch (err) {
            console.error(`Failed to migrate ${oldKey} to ${newKey}:`, err);
          }
        }
      }
    }
    
    const updatedArticle = await Article.findOneAndUpdate(
      { slug },
      { $set: body },
      { new: true }
    );

    if (!updatedArticle) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    return NextResponse.json({ success: true, article: updatedArticle }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error("Save Article Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectMongo();
    const user = await getAuthenticatedUser(request);
    if (!["Admin", "Subject Editor", "Staff"].includes(user?.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { slug } = resolvedParams;

    const article = await Article.findOne({ slug });
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    if (user.role === "Subject Editor" && (!user.managedSubjects || !user.managedSubjects.includes(article.subject))) {
      return NextResponse.json({ error: "Forbidden: Not assigned to this article's subject" }, { status: 403 });
    }
    if (user.role === "Staff" && article.authorId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own articles" }, { status: 403 });
    }

    const deletedArticle = await Article.findOneAndUpdate(
      { slug },
      { $set: { isDeleted: true } },
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
