export function clearLine() {
  process.stdout.write("\r" + " ".repeat(100) + "\r");
}

export function showPhase(phase: string) {
  process.stdout.write(phase + "\n");
}

export function showLiveUpdate(value: number, unit: string, symbol: string) {
  process.stdout.write(
    `\r${symbol} ${unit}: ${value.toFixed(2)} Mbps                    `,
  );
}

export function showProgressBar(
  elapsed: number,
  total: number,
  symbol: string,
  value: number,
  unit: string,
  valueUnit: string = "Mbps",
) {
  const percentage = Math.min(elapsed / total, 1);
  const barWidth = 30;
  const filled = Math.floor(percentage * barWidth);
  const empty = barWidth - filled;
  const bar =
    "=".repeat(filled) +
    ">".repeat(empty > 0 ? 1 : 0) +
    " ".repeat(Math.max(0, empty - 1));
  const pctStr = Math.floor(percentage * 100)
    .toString()
    .padStart(3);
  process.stdout.write(
    `\r${symbol} [${bar}] ${pctStr}% | ${unit}: ${value.toFixed(2)} ${valueUnit}                     `,
  );
}

export function showSummary(result: {
  downloadMbps: number;
  uploadMbps: number;
  ping: number;
  jitter: number;
}) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Kagi Speedtest Results");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `  ${"⬇ Download:".padEnd(12)} ${result.downloadMbps.toFixed(2)} Mbps`,
  );
  console.log(
    `  ${"⬆ Upload:".padEnd(12)} ${result.uploadMbps.toFixed(2)} Mbps`,
  );
  console.log(`  ${"Ping:".padEnd(12)} ${result.ping.toFixed(2)} ms`);
  console.log(`  ${"Jitter:".padEnd(12)} ${result.jitter.toFixed(2)} ms`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

export function showError(message: string) {
  console.error(`\n❌ Error: ${message}`);
}

export function showHeader(serverURL: string) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Kagi Speedtest CLI");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Server: ${serverURL}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}
