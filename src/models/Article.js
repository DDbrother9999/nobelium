import mongoose from "mongoose";
import { SUBJECTS } from "../lib/subjects";

const ArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    articleId: {
      type: String,
      unique: true,
      default: () => "ART-" + Math.floor(100000 + Math.random() * 900000).toString(),
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      enum: SUBJECTS,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    editionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Edition",
      required: false,
    },
    headerImageUrl: {
      type: String,
      default: "",
    },
    imageBank: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Draft", "Pending Review", "Published"],
      default: "Draft",
    },
    publishedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isCoverStory: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ArticleSchema.index({ isCoverStory: 1 }, { unique: true, partialFilterExpression: { isCoverStory: true } });

export default mongoose.models.Article || mongoose.model("Article", ArticleSchema);
