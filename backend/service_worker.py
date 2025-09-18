import asyncio
import json
from supabase import acreate_client, AsyncClient
import os
from dotenv import load_dotenv
from utils.supabase import SupabaseClient
import product_showcase as ps
from utils.video import parse_video
from utils.yt_search import fetch_top_shorts

async def evaluate_video(short: dict, client: SupabaseClient) -> bool:
    short_url = short["url"]
    if await client.video_exists(short_url):
        print(f"Video {short_url} already exists in the database.")
        return False
    await client.add_video_to_all(short_url)
    query = await parse_video(short_url)
    print("Query:", query)
    if query[1] == 200:
        chosen_products = ps.choose_best_products(json.dumps(query[0]))
        if not chosen_products:
            return False

        store = {}
        for p in chosen_products:
            if p["vendor"] not in store:
                store[p["vendor"]] = {"titles": [], "images": []}
            store[p["vendor"]]["titles"].append(p["title"])
            store[p["vendor"]]["images"].append(p["image"])

        await asyncio.gather(*[client.post_yt_row(key, short_url, value["images"], value["titles"], short["short_id"], short["email"], short["channel_id"]) for key, value in store.items()])
    return True

# async def test_youtube_comments(channel_id: str, video_id: str) -> None:
#     """Test the YouTube comments functionality with a given channel and video."""
#     try:
#         # 1. Get existing comments
#         print("\n1. Fetching existing comments...")
#         comments = await get_comments(channel_id, video_id, max_results=5)
#         print(f"Found {len(comments)} comments")
#         for comment in comments:
#             author = str(comment.get('authorDisplayName', 'Unknown'))
#             text = str(comment.get('text', ''))[:50]
#             print(f"- {author}: {text}...")

#         # 2. Create a new comment
#         print("\n2. Creating a new comment...")
#         new_comment = await create_comment(
#             channel_id=channel_id,
#             video_id=video_id,
#             text="This is a test comment from our API! 🚀"
#         )
#         comment_id = str(new_comment.get('id'))
#         print(f"Created comment with ID: {comment_id}")

#         import time

#         time.sleep(10)

#         # 3. Update the comment
#         print("\n3. Updating the comment...")
#         updated_comment = await update_comment(
#             channel_id=channel_id,
#             comment_id=comment_id,
#             new_text="This is an updated test comment! ✨",
#             video_id=video_id  # Pass video_id for creating if comment doesn't exist
#         )
#         print(f"Updated comment text: {updated_comment.get('text')}")

#         time.sleep(10)

#         # 4. Delete the comment
#         print("\n4. Deleting the test comment...")
#         await delete_comment(channel_id, comment_id)
#         print("Comment deleted successfully")

#     except Exception as e:
#         print(f"❌ Error during testing: {str(e)}")
#         raise

# async def test_youtube_comments(channel_id: str, video_id: str) -> None:
#     """Test the YouTube comments functionality with a given channel and video."""
#     try:
#         # 1. Get existing comments
#         print("\n1. Fetching existing comments...")
#         comments = await get_comments(channel_id, video_id, max_results=5)
#         print(f"Found {len(comments)} comments")
#         for comment in comments:
#             author = str(comment.get('authorDisplayName', 'Unknown'))
#             text = str(comment.get('text', ''))[:50]
#             print(f"- {author}: {text}...")

#         # 2. Create a new comment
#         print("\n2. Creating a new comment...")
#         new_comment = await create_comment(
#             channel_id=channel_id,
#             video_id=video_id,
#             text="This is a test comment from our API! 🚀"
#         )
#         comment_id = str(new_comment.get('id'))
#         print(f"Created comment with ID: {comment_id}")

#         import time

#         time.sleep(10)

#         # 3. Update the comment
#         print("\n3. Updating the comment...")
#         updated_comment = await update_comment(
#             channel_id=channel_id,
#             comment_id=comment_id,
#             new_text="This is an updated test comment! ✨",
#             video_id=video_id  # Pass video_id for creating if comment doesn't exist
#         )
#         print(f"Updated comment text: {updated_comment.get('text')}")

#         time.sleep(10)

#         # 4. Delete the comment
#         print("\n4. Deleting the test comment...")
#         await delete_comment(channel_id, comment_id)
#         print("Comment deleted successfully")

#     except Exception as e:
#         print(f"❌ Error during testing: {str(e)}")
#         raise

async def main():
    """Main function to run the service worker."""
    load_dotenv()

    # Check for required environment variables
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    # Check for required environment variables
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    # Initialize Supabase client
    supabase_url = str(os.getenv("SUPABASE_URL"))
    supabase_key = str(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    client = await SupabaseClient.from_client(await acreate_client(
        supabase_url,
        supabase_key
    ))

    # Loop through all the companies stored in our database

    shorts = await fetch_top_shorts("matcha")
    print(shorts)
    for short in shorts:
        await evaluate_video(short, client)

asyncio.run(main())

