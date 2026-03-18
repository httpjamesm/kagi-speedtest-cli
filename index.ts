import { runDownloadTest, runUploadTest, runPingJitterTest } from "./speedtest-worker";
import { showHeader, showProgressBar, showSummary, showError } from "./display";

const DEFAULT_SERVER_URL = "https://speedtest.kagi-0e7.workers.dev";

function parseArgs(): { serverURL: string; help: boolean } {
  const args = process.argv.slice(2);
  let serverURL = DEFAULT_SERVER_URL;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--url" || arg === "-u") {
      const nextArg = args[++i];
      if (nextArg !== undefined) {
        serverURL = nextArg;
      }
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { serverURL, help };
}

function showHelp() {
  console.log("Kagi Speedtest CLI\n");
  console.log("Usage: kagi-speedtest [options]\n");
  console.log("Options:");
  console.log("  -u, --url <url>  Custom server URL");
  console.log("  -h, --help       Show this help message\n");
  console.log("Example:");
  console.log("  kagi-speedtest --url https://speedtest.example.com\n");
}

async function main() {
  const { serverURL, help } = parseArgs();

  if (help) {
    showHelp();
    process.exit(0);
  }

  const abortController = new AbortController();

  process.on("SIGINT", () => {
    abortController.abort();
    showError("Test cancelled by user");
    process.exit(1);
  });

  try {
    showHeader(serverURL);

    const onProgress = (
      value: number,
      phase: "download" | "upload" | "ping" | "jitter",
      elapsed: number,
      total: number,
    ) => {
      if (phase === "download") {
        showProgressBar(elapsed, total, "⬇", value, "Speed");
      } else if (phase === "upload") {
        showProgressBar(elapsed, total, "⬆", value, "Speed");
      }
    };

    const downloadSpeed = await runDownloadTest(
      serverURL,
      onProgress,
      abortController.signal,
    );
    console.log(`\n⬇ Download: ${downloadSpeed.toFixed(2)} Mbps`);

    console.log();
    const uploadSpeed = await runUploadTest(
      serverURL,
      onProgress,
      abortController.signal,
    );
    console.log(`\n⬆ Upload: ${uploadSpeed.toFixed(2)} Mbps`);

    const { ping, jitter } = await runPingJitterTest(
      serverURL,
      onProgress,
      abortController.signal,
    );

    showSummary({
      downloadMbps: downloadSpeed,
      uploadMbps: uploadSpeed,
      ping,
      jitter,
    });

    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        showError("Test aborted");
      } else {
        showError(error.message);
      }
    } else {
      showError("An unknown error occurred");
    }
    process.exit(1);
  }
}

main();
