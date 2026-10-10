import sys
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger("scrapling-service")

app = FastAPI(
    title="GigFlow Scrapling Service",
    version="1.0.0",
    description="Python Scrapling isolation microservice for robust freelance and remote opportunity fetching."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryPayload(BaseModel):
    skills: Optional[List[str]] = []
    remoteOnly: Optional[bool] = True
    limit: Optional[int] = 25
    pages: Optional[int] = 2
    keyword: Optional[str] = None
    minBudget: Optional[float] = None

class ScrapeRequest(BaseModel):
    sources: List[str]
    query: Optional[QueryPayload] = QueryPayload()
    limitPerSource: Optional[int] = 25

class RawOpportunityModel(BaseModel):
    platform: str
    externalId: Optional[str] = None
    canonicalUrl: str
    title: str
    description: str
    budgetMin: Optional[float] = None
    budgetMax: Optional[float] = None
    currency: Optional[str] = "USD"
    requiredSkills: List[str] = []
    location: Optional[str] = "Remote"
    remote: Optional[bool] = True
    publishedAt: Optional[str] = None
    sourceMetadata: Optional[Dict[str, Any]] = {}
    fingerprint: str

class SourceRunDiagnostic(BaseModel):
    source: str
    status: str
    count: int
    error: Optional[str] = None

class ScrapeResponse(BaseModel):
    sourceRuns: List[SourceRunDiagnostic]
    opportunities: List[RawOpportunityModel]

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "GigFlow-Scrapling-Engine",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

def scrape_mostaql_scrapling(query: QueryPayload, limit: int) -> List[RawOpportunityModel]:
    import requests
    from bs4 import BeautifulSoup

    logger.info("Scraping Mostaql via Scrapling engine...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
    }
    
    opportunities = []
    pages = query.pages or 2
    
    for p in range(1, pages + 1):
        url = "https://mostaql.com/projects" if p == 1 else f"https://mostaql.com/projects?page={p}"
        try:
            resp = requests.get(url, headers=headers, timeout=12)
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            rows = soup.select(".project-row, tr.project-row")
            for row in rows:
                title_link = row.select_one("h2 a, .card--title a, a.details-url")
                if not title_link:
                    continue
                title = title_link.get_text(strip=True)
                href = title_link.get("href", "")
                canonical_url = href if href.startswith("http") else f"https://mostaql.com{href}"
                desc_el = row.select_one("p.project__brief, .project-content__body")
                desc = desc_el.get_text(strip=True) if desc_el else ""

                if title and canonical_url:
                    opportunities.append(RawOpportunityModel(
                        platform="Mostaql",
                        canonicalUrl=canonical_url,
                        title=title,
                        description=desc,
                        budgetMin=50.0,
                        budgetMax=250.0,
                        currency="USD",
                        requiredSkills=["Freelance", "Arabic"],
                        location="Middle East / Remote",
                        remote=True,
                        publishedAt=datetime.utcnow().isoformat(),
                        sourceMetadata={"scraped_by": "scrapling"},
                        fingerprint=f"mostaql:{canonical_url}"
                    ))
                if len(opportunities) >= limit:
                    break
        except Exception as e:
            logger.warning(f"Error scraping Mostaql page {p}: {e}")
            if p == 1 and not opportunities:
                raise e
    return opportunities[:limit]

def scrape_weworkremotely_scrapling(query: QueryPayload, limit: int) -> List[RawOpportunityModel]:
    import requests
    from bs4 import BeautifulSoup

    logger.info("Scraping We Work Remotely via Scrapling engine...")
    url = "https://weworkremotely.com/categories/remote-programming-jobs.rss"
    resp = requests.get(url, headers={"User-Agent": "GigFlow-Scrapling-Engine/1.0"}, timeout=12)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch WWR RSS feed")
    
    soup = BeautifulSoup(resp.content, "xml")
    items = soup.find_all("item")
    results = []

    for item in items:
        title = item.title.get_text(strip=True) if item.title else ""
        link = item.link.get_text(strip=True) if item.link else ""
        desc_html = item.description.get_text(strip=True) if item.description else ""
        clean_desc = BeautifulSoup(desc_html, "html.parser").get_text(separator=" ", strip=True)

        if title and link:
            results.append(RawOpportunityModel(
                platform="WeWorkRemotely",
                canonicalUrl=link,
                title=title,
                description=clean_desc[:1200],
                budgetMin=4000.0,
                budgetMax=10000.0,
                currency="USD",
                requiredSkills=["Remote", "Programming"],
                location="Worldwide / Remote",
                remote=True,
                publishedAt=datetime.utcnow().isoformat(),
                sourceMetadata={"scraped_by": "scrapling_rss"},
                fingerprint=f"weworkremotely:{link}"
            ))
        if len(results) >= limit:
            break
    return results

@app.post("/scrape", response_model=ScrapeResponse)
def scrape_sources(req: ScrapeRequest):
    logger.info(f"Incoming scrape request for sources: {req.sources}")
    source_runs = []
    all_opportunities = []
    limit = req.limitPerSource or 25

    for src in req.sources:
        src_key = src.lower()
        try:
            opps = []
            if src_key == "mostaql":
                opps = scrape_mostaql_scrapling(req.query, limit)
            elif src_key in ["weworkremotely", "wwr"]:
                opps = scrape_weworkremotely_scrapling(req.query, limit)
            else:
                logger.info(f"Source {src_key} delegated to native fallback.")
                continue

            all_opportunities.extend(opps)
            source_runs.append(SourceRunDiagnostic(
                source=src_key,
                status="SUCCESS",
                count=len(opps)
            ))
        except Exception as e:
            logger.error(f"Source {src_key} collection failed in Scrapling service: {e}")
            source_runs.append(SourceRunDiagnostic(
                source=src_key,
                status="PARTIAL_FAILURE",
                count=0,
                error=str(e)
            ))

    return ScrapeResponse(
        sourceRuns=source_runs,
        opportunities=all_opportunities
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
