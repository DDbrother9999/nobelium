import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import connectMongo from "@/lib/mongodb";
import Article from "@/models/Article";
import Edition from "@/models/Edition";
import User from "@/models/User";
import slugify from "slugify";
import { adminAuth } from "@/lib/firebaseAdmin";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    
    await connectMongo();
    const user = await User.findOne({ firebaseUid: decodedClaims.uid });
    if (!user) return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    if (user.role !== "Admin" && user.role !== "Editor") {
      return NextResponse.json({ error: "Forbidden: Admins or Editors only" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const editionId = formData.get("editionId");
    const title = formData.get("title") || "Imported EPUB Article";
    const subject = formData.get("subject") || "Biology";
    
    if (!file || !editionId) {
      return NextResponse.json({ error: "File and Edition ID are required" }, { status: 400 });
    }

    const edition = await Edition.findById(editionId);
    if (!edition) return NextResponse.json({ error: "Edition not found" }, { status: 404 });

    let baseSlug = slugify(title, { lower: true, strict: true });
    if (!baseSlug) baseSlug = "imported-article";

    let articleSlug = baseSlug;
    let counter = 1;
    while (await Article.findOne({ slug: articleSlug })) {
      articleSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const editionSlug = edition.slug;


    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    let rawHtmlArray = [];
    const imageMap = {}; 

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const entryName = entry.entryName;
      
      if (entryName.includes("__MACOSX") || path.basename(entryName).startsWith("._")) {
        continue;
      }

      const ext = path.extname(entryName).toLowerCase();
      const baseName = path.basename(entryName);

      const isImage = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext);
      
      if (isImage) {
        if (!entryName.toLowerCase().includes("/image/") && !entryName.toLowerCase().includes("/images/")) {
          continue;
        }

        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const fileContent = entry.getData();
        const s3Key = `uploads/editions/${editionSlug}/${articleSlug}/${cleanBaseName}`;
        
        let contentType = "application/octet-stream";
        if (ext === ".png") contentType = "image/png";
        else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
        else if (ext === ".gif") contentType = "image/gif";
        else if (ext === ".svg") contentType = "image/svg+xml";
        else if (ext === ".webp") contentType = "image/webp";

        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: s3Key,
          Body: fileContent,
          ContentType: contentType,
        });

        try {
          await s3Client.send(command);
          const publicUrl = `${R2_PUBLIC_URL}/${s3Key}`;
          imageMap[baseName] = publicUrl;
        } catch (s3Error) {
          console.error(`Failed to upload ${cleanBaseName} to S3:`, s3Error);
        }
      } else if ([".html", ".xhtml"].includes(ext)) {
        if (baseName.toLowerCase() === "index.html" || baseName.toLowerCase() === "toc.html") continue;
        const content = entry.getData().toString('utf-8');
        rawHtmlArray.push({ name: entryName, content });
      }
    }

    rawHtmlArray.sort((a, b) => a.name.localeCompare(b.name));

    let finalHtml = "";

    const { JSDOM } = await import("jsdom");

    for (const htmlFile of rawHtmlArray) {
      const dom = new JSDOM(htmlFile.content);
      const document = dom.window.document;

      const spans = document.querySelectorAll("span");
      spans.forEach(span => {
        if (!span.className && !span.style.length && span.childNodes.length === 1 && span.firstChild.nodeType === 3) {
          const text = document.createTextNode(span.textContent);
          span.parentNode.replaceChild(text, span);
        }
      });

      const figures = document.querySelectorAll("figure");
      figures.forEach(fig => fig.parentNode.removeChild(fig));

      const images = document.querySelectorAll("img");
      images.forEach(img => {
        img.parentNode.removeChild(img);
      });

      const links = document.querySelectorAll("a");
      links.forEach(link => {
        const url = link.getAttribute("href") || "#";
        const text = link.textContent || url;
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.textContent = text;
        anchor.style.color = 'var(--primary)';
        link.parentNode.replaceChild(anchor, link);
      });

      if (document.body) {
        finalHtml += document.body.innerHTML + "\n<hr/>\n";
      } else {
        finalHtml += document.documentElement.innerHTML + "\n<hr/>\n";
      }
    }

    const article = await Article.create({
      title,
      slug: articleSlug,
      content: finalHtml,
      subject,
      authorId: user._id,
      editionId: edition._id,
      status: "Draft",
      imageBank: Object.values(imageMap)
    });

    return NextResponse.json({ success: true, articleSlug });
  } catch (error) {
    console.error("HTML Zip Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
