import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff | Nobelium",
};

const ROLE_ORDER = { Admin: 0, "Subject Editor": 1, Staff: 2 };

export default async function StaffPage() {
  await connectMongo();

  const users = await User.find({ name: { $ne: "New User" } })
    .select("name title role bio pronouns graduationYear avatarUrl")
    .lean();

  users.sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3) || a.name.localeCompare(b.name)
  );

  return (
    <div className="container staff-page">
      <h1 className="staff-title">Staff</h1>
      {users.length === 0 ? (
        <p className="staff-empty">No staff listed yet.</p>
      ) : (
        <div className="staff-grid">
          {users.map(member => (
            <Link href={`/personal/${member._id}`} className="staff-card" key={String(member._id)}>
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="staff-avatar" />
              ) : (
                <span className="staff-avatar"><UserIcon size={32} /></span>
              )}
              <div className="staff-info">
                <span className="kicker">{member.title || "Staff"}</span>
                <h2>{member.name}</h2>
                {(member.pronouns || member.graduationYear) && (
                  <span className="byline">
                    {[member.pronouns, member.graduationYear && `Class of ${member.graduationYear}`].filter(Boolean).join(" · ")}
                  </span>
                )}
                {member.bio && <p>{member.bio}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
