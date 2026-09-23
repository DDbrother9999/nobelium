export const SUBJECTS = ["Biology", "Chemistry", "Physics", "Computer Science", "Psychology", "Environmental Science"];

export function subjectHref(subject) {
  return `/articles?subject=${encodeURIComponent(subject)}`;
}
