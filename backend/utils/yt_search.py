from __future__ import annotations
import os
import re
from googleapiclient.discovery import build
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import traceback
from typing import Optional

load_dotenv()

async def fetch_top_shorts(keyword: str, max_results: int = 10, relevance_language: Optional[list[str]] = None, region_code: str | None = None, order: str = "viewCount", published_after_days: int = 7):
    youtube = build("youtube", "v3")
    published_after = (datetime.now(timezone.utc) - timedelta(days=published_after_days)).strftime("%Y-%m-%dT%H:%M:%SZ")

    request_params = {
        "part": "snippet",
        "q": keyword,
        "type": "video",
        "maxResults": max_results,
        "order": order,
        "publishedAfter": published_after,
        "videoDuration": "short",
        "relevanceLanguage": "en",
        "location": "43.6532,-79.3832", # Toronto coordinates
        "locationRadius": "100km",
    }

    if relevance_language:
        request_params["relevanceLanguage"] = relevance_language
    if region_code:
        request_params["regionCode"] = region_code

    request = youtube.search().list(**request_params)
    response = request.execute()

    videos = []
    for item in response.get("items", []):
        video_id = item["id"]["videoId"]
        snippet = item["snippet"]
        channel_id = snippet["channelId"]
        
        # Get channel email for this video
        email = await get_channel_email(channel_id)
        
        videos.append({
            "id": video_id,
            "short_id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "title": snippet["title"],
            "description": snippet["description"],
            "thumbnail": snippet["thumbnails"]["high"]["url"],
            "channelTitle": snippet["channelTitle"],
            "channel_id": channel_id,
            "publishedAt": snippet["publishedAt"],
            "email": email,
        })

    return videos

async def get_channel_email(channel_id: str):
    """
    Fetches the email from a YouTube channel's description.

    Args:
        channel_id: The ID of the YouTube channel.

    Returns:
        The first email found in the description, or None if not found.
    """
    try:
        youtube = build("youtube", "v3")
        request = youtube.channels().list(
            part="snippet",
            id=channel_id
        )
        response = request.execute()

        if response.get("items"):
            description = response["items"][0]["snippet"]["description"]
            print(description)
            # TEMPORARILY:
            return os.getenv("DEFAULT_EMAIL")
            # match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", description)
            # if match:
                # return match.group(0)
        return os.getenv("DEFAULT_EMAIL")
    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()
        return None
