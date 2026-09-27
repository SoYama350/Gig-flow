import { KhamsatScraper } from "./src/services/scraper.ts";

async function test() {
  try {
    console.log("Running Khamsat scraper test...");
    const gigs = await KhamsatScraper.fetchLatestGigs(1);
    console.log(`Success! Scraped ${gigs.length} gigs.`);
    if (gigs.length > 0) {
      console.log("Sample gig:", gigs[0]);
    }
  } catch (err: any) {
    console.error("Test failed with error:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Headers:", err.response.headers);
    }
  }
}

test();
