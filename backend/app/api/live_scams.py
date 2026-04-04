from fastapi import APIRouter
import httpx
import os

router = APIRouter()

@router.get("/live-scams")
async def get_live_scams():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://newsapi.org/v2/everything?q=scam OR fraud OR phishing OR UPI&language=en&pageSize=6&apiKey={os.getenv('NEWS_API_KEY')}"
        )
        news = res.json()

    results = []

    for article in news.get("articles", []):
        desc = (article.get("description") or "").lower()

        # 🔥 Smart type detection
        if "upi" in desc:
            scam_type = "UPI Scam"
        elif "job" in desc:
            scam_type = "Job Scam"
        elif "crypto" in desc:
            scam_type = "Crypto Scam"
        elif "phishing" in desc:
            scam_type = "Phishing"
        else:
            scam_type = "General Scam"

        results.append({
            "title": article.get("title"),
            "description": article.get("description"),
            "source": article["source"]["name"],
            "image": article.get("urlToImage"),
            "url": article.get("url"),
            "risk": "medium",  # can upgrade later
            "type": scam_type,
            "summary": article.get("description"),
        })

    return results