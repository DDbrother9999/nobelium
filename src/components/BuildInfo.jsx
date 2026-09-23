"use client";

import { useEffect, useState } from "react";

const commit = process.env.BUILD_COMMIT;
const committedAt = process.env.BUILD_COMMIT_TIME;

const UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function timeAgo(date, now) {
  const seconds = Math.round((date - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export default function BuildInfo({ year }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    const timeout = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, []);

  if (!commit) return <span>{year} Nobelium</span>;

  return (
    <span>
      {year} Nobelium - Build {commit}
      {now && committedAt && ` from ${timeAgo(new Date(committedAt), now)}`}
    </span>
  );
}
