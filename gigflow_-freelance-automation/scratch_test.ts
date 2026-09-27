import { KhamsatScraper } from './src/services/scraper.ts';

async function test() {
  const gigs = await KhamsatScraper.fetchLatestGigs(1);
  console.log("Khamsat gigs:", gigs.length);
  if (gigs.length > 0) {
    console.log(gigs[0]);
  }
}
test();
