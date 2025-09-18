from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, TypeAlias
from dotenv import load_dotenv
from supabase import create_client, Client
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Type aliases for cleaner annotations
JSONValue: TypeAlias = dict[str, Any] | list[Any] | str | int | float | bool | None
JSONDict: TypeAlias = dict[str, JSONValue]
CreatorTokens: TypeAlias = tuple[str, str, datetime]  # access_token, refresh_token, expires_at

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

if not all([SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET]):
    raise ValueError("Missing required environment variables")

# Initialize Supabase client
supabase: Client = create_client(
    str(SUPABASE_URL),
    str(SUPABASE_KEY)
)

async def get_creator_tokens(channel_id: str) -> CreatorTokens:
    """
    Fetch creator's OAuth tokens from Supabase.
    
    Args:
        channel_id (str): The YouTube channel ID
        
    Returns:
        CreatorTokens: (access_token, refresh_token, expires_at)
        
    Raises:
        ValueError: If creator tokens not found
    """
    response = supabase.table("creator_tokens") \
        .select("access_token,refresh_token,expires_at") \
        .eq("channel_id", channel_id) \
        .execute()
    
    if not response.data:
        raise ValueError(f"No tokens found for channel {channel_id}")
    
    token_data = response.data[0]
    return (
        token_data["access_token"],
        token_data["refresh_token"],
        datetime.fromisoformat(token_data["expires_at"].replace("Z", "+00:00"))
    )

def update_creator_tokens(channel_id: str, access_token: str, expires_at: datetime) -> None:
    """Update stored tokens after a refresh."""
    supabase.table("creator_tokens") \
        .update({
            "access_token": access_token,
            "expires_at": expires_at.isoformat()
        }) \
        .eq("channel_id", channel_id) \
        .execute()

def get_youtube_client(access_token: str, refresh_token: str, channel_id: str) -> Any:
    """
    Get an authenticated YouTube client using OAuth2 credentials.
    
    Args:
        access_token (str): The OAuth2 access token
        refresh_token (str): The channel ID (for token updates)
        channel_id (str): The YouTube channel ID
        
    Returns:
        Any: Authenticated YouTube API client
    """
    def token_refresh_handler(new_creds: Credentials) -> None:
        """Called when Google refreshes the access token."""
        if new_creds.expiry:
            expires_at = datetime.fromtimestamp(new_creds.expiry.timestamp(), tz=timezone.utc)
            update_creator_tokens(channel_id, new_creds.token, expires_at)
    
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=str(GOOGLE_CLIENT_ID),
        client_secret=str(GOOGLE_CLIENT_SECRET),
        scopes=["https://www.googleapis.com/auth/youtube.force-ssl"]
    )
    
    # Setup token refresh callback
    creds.expiry = None  # Will be set by Google on first API call
    setattr(creds, '_token_refresh_callback', token_refresh_handler)
    
    return build("youtube", "v3", credentials=creds)

async def create_comment(
    channel_id: str,
    video_id: str,
    text: str,
    parent_id: str | None = None
) -> JSONDict:
    """
    Create a new comment or reply on a YouTube video.
    
    Args:
        channel_id (str): The ID of the YouTube channel making the comment
        video_id (str): The ID of the video to comment on
        text (str): The text content of the comment
        parent_id (str | None): If provided, this comment will be a reply to the specified comment
        
    Returns:
        JSONDict: The created comment resource
    """
    # Get creator's OAuth tokens
    access_token, refresh_token, _ = await get_creator_tokens(channel_id)
    youtube = get_youtube_client(access_token, refresh_token, channel_id)
    
    try:
        if parent_id:
            # This is a reply to an existing comment
            comment_body = {
                "snippet": {
                    "parentId": parent_id,
                    "textOriginal": text
                }
            }
            request = youtube.comments().insert(
                part="snippet",
                body=comment_body
            )
            response = request.execute()
            
            return {
                "id": response["id"],
                "text": response["snippet"]["textOriginal"],
                "authorDisplayName": response["snippet"]["authorDisplayName"],
                "publishedAt": response["snippet"]["publishedAt"],
                "videoId": response["snippet"].get("videoId"),
                "parentId": response["snippet"].get("parentId")
            }
        else:
            # This is a top-level comment - create a comment thread
            thread_body = {
                "snippet": {
                    "videoId": video_id,
                    "topLevelComment": {
                        "snippet": {
                            "textOriginal": text
                        }
                    }
                }
            }
            request = youtube.commentThreads().insert(
                part="snippet",
                body=thread_body
            )
            response = request.execute()
            
            comment = response["snippet"]["topLevelComment"]
            return {
                "id": comment["id"],
                "text": comment["snippet"]["textOriginal"],
                "authorDisplayName": comment["snippet"]["authorDisplayName"],
                "publishedAt": comment["snippet"]["publishedAt"],
                "videoId": video_id,
                "parentId": None
            }
        
    except Exception as e:
        print(f"Error creating comment: {str(e)}")
        raise

async def get_comments(
    channel_id: str,
    video_id: str,
    max_results: int = 20
) -> list[JSONDict]:
    """
    Fetch comments for a YouTube video.
    
    Args:
        channel_id (str): The ID of the YouTube channel fetching the comments
        video_id (str): The ID of the video to get comments from
        max_results (int): Maximum number of comments to return
        
    Returns:
        list[JSONDict]: List of comment resources
    """
    # Get creator's OAuth tokens
    access_token, refresh_token, _ = await get_creator_tokens(channel_id)
    youtube = get_youtube_client(access_token, refresh_token, channel_id)
    
    try:
        # Get top-level comments
        request = youtube.commentThreads().list(
            part="snippet,replies",
            videoId=video_id,
            maxResults=max_results
        )
        response = request.execute()
        
        comments = []
        for item in response.get("items", []):
            comment = item["snippet"]["topLevelComment"]["snippet"]
            comments.append({
                "id": item["id"],
                "text": comment["textOriginal"],
                "authorDisplayName": comment["authorDisplayName"],
                "publishedAt": comment["publishedAt"],
                "likeCount": comment["likeCount"],
                "replyCount": item["snippet"]["totalReplyCount"],
                "replies": [
                    {
                        "id": reply["id"],
                        "text": reply["snippet"]["textOriginal"],
                        "authorDisplayName": reply["snippet"]["authorDisplayName"],
                        "publishedAt": reply["snippet"]["publishedAt"],
                        "likeCount": reply["snippet"]["likeCount"]
                    }
                    for reply in item.get("replies", {}).get("comments", [])
                ] if "replies" in item else []
            })
        
        return comments
        
    except Exception as e:
        print(f"Error fetching comments: {str(e)}")
        raise

async def check_comment_ownership(youtube: Any, comment_id: str, channel_id: str) -> tuple[bool, str | None]:
    """
    Check if a comment exists and belongs to the specified channel.
    
    Args:
        youtube: The YouTube API client
        comment_id (str): The ID of the comment to check
        channel_id (str): The channel ID to verify ownership
        
    Returns:
        tuple[bool, str | None]: (exists_and_owned, video_id)
    """
    try:
        comment = youtube.comments().list(
            part="snippet",
            id=comment_id
        ).execute()
        
        if not comment.get("items"):
            return False, None
            
        comment_data = comment["items"][0]
        comment_channel_id = comment_data["snippet"].get("authorChannelId", {}).get("value")
        video_id = comment_data["snippet"].get("videoId")
        
        return comment_channel_id == channel_id, video_id
        
    except Exception:
        return False, None

async def update_comment(channel_id: str, comment_id: str, new_text: str, video_id: str | None = None) -> JSONDict:
    """
    Update an existing YouTube comment or create a new one if it doesn't exist.
    
    Args:
        channel_id (str): The ID of the YouTube channel updating/creating the comment
        comment_id (str): The ID of the comment to update
        new_text (str): The new text content for the comment
        video_id (str | None): Required if creating a new comment
        
    Returns:
        JSONDict: The updated or created comment resource
        
    Raises:
        ValueError: If video_id is not provided when creating a new comment
    """
    # Get creator's OAuth tokens
    access_token, refresh_token, _ = await get_creator_tokens(channel_id)
    youtube = get_youtube_client(access_token, refresh_token, channel_id)
    
    try:
        # Check if comment exists and belongs to creator
        owned, existing_video_id = await check_comment_ownership(youtube, comment_id, channel_id)
        
        # If comment doesn't exist or isn't owned by creator, create new comment
        if not owned:
            if not video_id:
                raise ValueError("video_id is required when creating a new comment")
                
            return await create_comment(channel_id, video_id, new_text)
        
        # If we get here, comment exists and belongs to creator - update it
        comment = youtube.comments().list(
            part="snippet",
            id=comment_id
        ).execute()["items"][0]

        # Update the text while preserving other fields
        comment["snippet"]["textOriginal"] = new_text
        
        # Update the comment
        request = youtube.comments().update(
            part="snippet",
            body=comment
        )
        response = request.execute()
        
        return {
            "id": response["id"],
            "text": response["snippet"]["textOriginal"],
            "authorDisplayName": response["snippet"]["authorDisplayName"],
            "publishedAt": response["snippet"]["publishedAt"],
            "updatedAt": response["snippet"].get("updatedAt"),
            "videoId": response["snippet"]["videoId"]
        }
        
    except Exception as e:
        print(f"Error updating/creating comment: {str(e)}")
        raise

async def delete_comment(channel_id: str, comment_id: str) -> None:
    """
    Delete a YouTube comment.
    
    Args:
        channel_id (str): The ID of the YouTube channel deleting the comment
        comment_id (str): The ID of the comment to delete
    """
    # Get creator's OAuth tokens
    access_token, refresh_token, _ = await get_creator_tokens(channel_id)
    youtube = get_youtube_client(access_token, refresh_token, channel_id)
    
    try:
        youtube.comments().delete(
            id=comment_id
        ).execute()
        
    except Exception as e:
        print(f"Error deleting comment: {str(e)}")
        raise
