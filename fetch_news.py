import os
import json
import requests
import feedparser
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Set up the OpenAI client for GitHub Models
# The endpoint is https://models.inference.ai.azure.com
token = os.environ.get("GITHUB_TOKEN")
if not token:
    raise ValueError("GITHUB_TOKEN environment variable is required")

client = OpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=token,
)

RSS_FEEDS = [
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://www.theverge.com/rss/artificial-intelligence/index.xml",
    "https://www.artificialintelligence-news.com/feed/"
]

def analyze_article(title, summary, link):
    prompt = f"""
Analyze the following news article. 
Determine if it is about Artificial Intelligence. If it's not strongly related to AI, return exactly the string "SKIP".
If it is related to AI, provide a short summary (up to an abstract length) in Hebrew.
Also, classify it into EXACTLY ONE of the following categories:
- מודלי AI (LLM, VLAM, רובוטיקה ועוד)
- רגולציה, אבטחה ופרטיות
- עסקים (מיזוגים, רכישות ועוד)
- פרויקטים ואלגוריתמים מעניינים

Title: {title}
Summary: {summary}
Link: {link}

Return the result STRICTLY as a JSON object with the following keys and no extra markdown formatting:
{{
  "category": "One of the exact Hebrew categories listed above",
  "summary": "The Hebrew summary",
  "title_he": "The translated Hebrew title"
}}
If not AI related, just return "SKIP" (not JSON).
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional Hebrew AI news summarizer and translator. You output exact JSON as requested."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=600
        )
        
        content = response.choices[0].message.content.strip()
        if content == "SKIP" or "SKIP" in content:
            return None
        
        # Remove any potential markdown json blocks if the model returned them
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        result = json.loads(content.strip())
        return result
    except Exception as e:
        print(f"Error analyzing article '{title}': {e}")
        return None

def main():
    all_news = []
    
    # We limit the total number of articles to avoid hitting rate limits too hard during testing
    max_articles_to_process = 20
    processed_count = 0
    
    for feed_url in RSS_FEEDS:
        print(f"Parsing feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        
        for entry in feed.entries[:10]: # Look at top 10 from each feed
            if processed_count >= max_articles_to_process:
                break
                
            title = entry.title
            summary = getattr(entry, 'summary', '')
            link = getattr(entry, 'link', '')
            
            # extract clean date
            dt = datetime.now()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                dt = datetime(*entry.published_parsed[:6])
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                dt = datetime(*entry.updated_parsed[:6])
            
            published = dt.isoformat()
            
            print(f"Analyzing [{processed_count+1}/{max_articles_to_process}]: {title}")
            analysis = analyze_article(title, summary, link)
            
            if analysis:
                source_title = feed_url
                if hasattr(feed, 'feed') and hasattr(feed.feed, 'title'):
                    source_title = feed.feed.title
                    
                news_item = {
                    "id": str(hash(link)),
                    "title": analysis.get("title_he", title),
                    "original_title": title,
                    "summary": analysis.get("summary", ""),
                    "category": analysis.get("category", ""),
                    "link": link,
                    "published": published,
                    "source": source_title
                }
                all_news.append(news_item)
                print(f"  -> Added to category: {news_item['category']}")
            else:
                print("  -> Skipped (Not relevant or error)")
                
            processed_count += 1
            
        if processed_count >= max_articles_to_process:
            break
            
    # Make sure data directory exists
    os.makedirs("data", exist_ok=True)
    
    # Sort by published date descending
    all_news.sort(key=lambda x: x.get('published', ''), reverse=True)
    
    with open("data/news.json", "w", encoding="utf-8") as f:
        json.dump(all_news, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully saved {len(all_news)} news items to data/news.json")

if __name__ == "__main__":
    main()
