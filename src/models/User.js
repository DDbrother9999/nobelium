import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      default: "",
    },
    pronouns: {
      type: String,
      default: "",
    },
    graduationYear: {
      type: String,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["Admin", "Subject Editor", "Staff"],
      default: "Staff",
    },
    managedSubjects: {
      type: [String],
      enum: [
        "Biology",
        "Chemistry",
        "Physics",
        "Computer Science",
        "Psychology",
        "Environmental Science",
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
