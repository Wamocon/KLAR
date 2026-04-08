/**
 * KLAR Load Test — /api/verify endpoint
 *
 * Run: npx tsx scripts/load-test.ts [--url=BASE_URL] [--concurrency=N] [--requests=N]
 *
 * Tests concurrent verification requests to measure:
 * - Response time (p50, p95, p99)
 * - Error rate
 * - Rate limiter behavior under load
 * - SSE stream completion
 */

const BASE_URL = process.argv.find(a => a.startsWith("--url="))?.split("=")[1] || "http://localhost:3333";
const CONCURRENCY = parseInt(process.argv.find(a => a.startsWith("--concurrency="))?.split("=")[1] || "5");
const TOTAL_REQUESTS = parseInt(process.argv.find(a => a.startsWith("--requests="))?.split("=")[1] || "20");

const TEST_TEXTS = [
  "The Eiffel Tower was built in 1889 and is located in Paris, France. It stands 324 meters tall and was designed by Gustave Eiffel. It was originally built as the entrance arch for the 1889 World's Fair.",
  "Germany has a population of approximately 84 million people and its capital is Berlin. The country is the largest economy in Europe and fourth-largest in the world by nominal GDP.",
  "The speed of light in a vacuum is approximately 299,792 kilometers per second. Albert Einstein's theory of special relativity, published in 1905, established that nothing can travel faster than light.",
  "The Amazon rainforest covers approximately 5.5 million square kilometers and spans nine countries in South America. It produces about 20% of the world's oxygen supply.",
  "Bitcoin was created in 2009 by an anonymous person or group using the pseudonym Satoshi Nakamoto. The first Bitcoin transaction involved 10,000 BTC being used to purchase two pizzas.",
];

interface TestResult {
  index: number;
  status: number;
  duration: number;
  eventsReceived: number;
  completed: boolean;
  error?: string;
}

async function runSingleRequest(index: number): Promise<TestResult> {
  const text = TEST_TEXTS[index % TEST_TEXTS.length];
  const start = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: "en", analyses: ["fact-check"] }),
    });

    const duration = Date.now() - start;

    if (response.status === 429) {
      return { index, status: 429, duration, eventsReceived: 0, completed: false, error: "Rate limited" };
    }

    if (!response.ok) {
      const body = await response.text();
      return { index, status: response.status, duration, eventsReceived: 0, completed: false, error: body.slice(0, 200) };
    }

    // Read SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let eventsReceived = 0;
    let completed = false;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          eventsReceived++;
          if (line.includes("[DONE]")) { completed = true; break; }
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.type === "completed") completed = true;
          } catch { /* skip parse errors */ }
        }
        if (completed) break;
      }
    }

    return { index, status: response.status, duration: Date.now() - start, eventsReceived, completed };
  } catch (err) {
    return { index, status: 0, duration: Date.now() - start, eventsReceived: 0, completed: false, error: String(err) };
  }
}

async function runBatch(startIdx: number, count: number): Promise<TestResult[]> {
  const promises = Array.from({ length: count }, (_, i) => runSingleRequest(startIdx + i));
  return Promise.all(promises);
}

async function main() {
  console.log(`\n🔥 KLAR Load Test`);
  console.log(`   Target:      ${BASE_URL}/api/verify`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Total:       ${TOTAL_REQUESTS}`);
  console.log(`   ${"─".repeat(40)}\n`);

  const allResults: TestResult[] = [];
  let completed = 0;

  for (let batch = 0; batch < Math.ceil(TOTAL_REQUESTS / CONCURRENCY); batch++) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_REQUESTS - completed);
    const startIdx = completed;

    process.stdout.write(`   Batch ${batch + 1}: Sending ${batchSize} concurrent requests... `);
    const results = await runBatch(startIdx, batchSize);
    allResults.push(...results);
    completed += batchSize;

    const ok = results.filter(r => r.completed).length;
    const limited = results.filter(r => r.status === 429).length;
    const failed = results.filter(r => !r.completed && r.status !== 429).length;
    console.log(`✓ ${ok} ok, ${limited} rate-limited, ${failed} failed`);

    // Small delay between batches to not overwhelm
    if (batch < Math.ceil(TOTAL_REQUESTS / CONCURRENCY) - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Compute stats
  const durations = allResults.map(r => r.duration).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const completedCount = allResults.filter(r => r.completed).length;
  const rateLimited = allResults.filter(r => r.status === 429).length;
  const errors = allResults.filter(r => !r.completed && r.status !== 429).length;
  const avgEvents = Math.round(allResults.filter(r => r.completed).reduce((a, r) => a + r.eventsReceived, 0) / Math.max(completedCount, 1));

  console.log(`\n   ${"─".repeat(40)}`);
  console.log(`   Results:`);
  console.log(`     Completed:    ${completedCount}/${TOTAL_REQUESTS} (${Math.round(completedCount / TOTAL_REQUESTS * 100)}%)`);
  console.log(`     Rate Limited: ${rateLimited}`);
  console.log(`     Errors:       ${errors}`);
  console.log(`     Avg Events:   ${avgEvents} SSE events per request`);
  console.log(`\n   Latency:`);
  console.log(`     Average: ${avgDuration}ms`);
  console.log(`     p50:     ${p50}ms`);
  console.log(`     p95:     ${p95}ms`);
  console.log(`     p99:     ${p99}ms`);
  console.log(`     Min:     ${durations[0]}ms`);
  console.log(`     Max:     ${durations[durations.length - 1]}ms`);
  console.log();

  // Exit with error if too many failures
  if (errors > TOTAL_REQUESTS * 0.2) {
    console.error("   ❌ FAIL: Error rate exceeds 20%\n");
    process.exit(1);
  }
  console.log("   ✅ PASS: Load test completed within acceptable thresholds\n");
}

main().catch(console.error);
