import mongoose from "mongoose";

const DEV_MONGODB_URI = process.env.DEV_MONGODB_URI;
const ADMIN_EMAILS = process.env.ADMIN_EMAILS;

if (!DEV_MONGODB_URI) {
  console.error("Please define the DEV_MONGODB_URI environment variable in .env.dev");
  process.exit(1);
}

if (!ADMIN_EMAILS) {
  console.error("Please define ADMIN_EMAILS in .env.dev");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    role: { type: String, enum: ["Admin", "Subject Editor", "Staff"], default: "Staff" },
    managedSubjects: { type: [String], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function bootstrap() {
  try {
    await mongoose.connect(DEV_MONGODB_URI);
    console.log("Connected to MongoDB.");

    const emails = ADMIN_EMAILS.split(",").map((e) => e.trim());
    for (const email of emails) {
      if (!email) continue;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log(`User with email ${email} already exists. Updating role to Admin...`);
        existingUser.role = "Admin";
        await existingUser.save();
      } else {
        console.log(`Creating new Admin user for ${email}...`);
        await User.create({
          name: "Admin User",
          email: email,
          role: "Admin",
        });
      }
    }
    console.log("Bootstrap complete.");
  } catch (error) {
    console.error("Error bootstrapping admin:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

bootstrap();
