export function isEditor(user) {
  return user.role === "Admin" || user.role === "Subject Editor";
}

export function canEditArticle(user, article) {
  if (user.role === "Admin") return true;
  if (user.role === "Subject Editor") return user.managedSubjects.includes(article.subject);
  if (user.role === "Staff") return article.authorId.toString() === user._id.toString();
  return false;
}
