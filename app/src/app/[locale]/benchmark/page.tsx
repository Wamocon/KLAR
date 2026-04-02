import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LeaderboardContent from "./leaderboard-content";

export const metadata: Metadata = {
  title: "Benchmark Leaderboard — KLAR",
  description: "Public leaderboard for AI agent factual accuracy benchmarks. See how models perform on KLAR's standardized fact-checking exam.",
};

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LeaderboardContent locale={locale} />;
}
