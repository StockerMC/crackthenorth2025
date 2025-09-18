from dotenv import load_dotenv
load_dotenv()

from utils import shopify, vectordb, yt_search
from blacksheep import Request, Application, delete, get, post, json
from blacksheep.server.cors import CORSPolicy
from utils.supabase import SupabaseClient
import product_showcase as ps
from utils.video import parse_video
import json as json_lib

app = Application()

# Configure CORS
app.use_cors(
    allow_methods="GET POST PUT DELETE OPTIONS",
    allow_origins="*",  # In production, specify exact origins
    allow_headers="*",
    allow_credentials=True
)

# Global SupabaseClient instance
supabase_client: SupabaseClient | None = None

@app.on_start
async def on_start(application: Application):
    """Initialize global resources when the application starts"""
    global supabase_client
    supabase_client = SupabaseClient()
    await supabase_client.initialize()
    print("✅ SupabaseClient initialized")

@app.after_start
async def after_start(application: Application):
    """Called after the application has started"""
    print("🚀 BlackSheep application started successfully")

@app.on_stop
async def on_stop(application: Application):
    """Clean up global resources when the application shuts down"""
    global supabase_client
    if supabase_client:
        await supabase_client.close()
        print("✅ SupabaseClient closed")

# Health check endpoint
@get("/")
async def health_check():
    return json({"status": "healthy", "message": "API is running"})

# Ingest products from Shopify store
@post("/ingest")
async def ingest_products(request: Request):
    try:
        data = await request.json()
        shop_url = data.get("shop_url")
        
        if not shop_url:
            return json({"error": "shop_url is required"}, status=200)
        
        # Get products from Shopify
        products = shopify.get_products(shop_url)
        
        products_with_images = [p for p in products if p.get("image")]
        
        if not products_with_images:
            return json({"error": "No products with images found"}, status=200)
        
        # Create embeddings and upsert to vector DB
        embeddings = vectordb.embed_products(products_with_images)
        vectordb.upsert_embeddings(embeddings)
        
        return json({
            "message": f"Successfully ingested {len(embeddings)} products",
            "products_processed": len(embeddings),
            "total_products": len(products)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return json({"error": str(e)}, status=200)

# Search for similar products by image URL
@post("/search/image")
async def search_by_image(request: Request):
    try:
        data = await request.json()
        image_url = data.get("image_url")
        top_k = data.get("top_k", 5)
        
        if not image_url:
            return json({"error": "image_url is required"}, status=400)
        
        # Get embedding for the query image
        embedding_response = vectordb.imageurl_to_embedding(image_url)
        query_vector = embedding_response.embeddings.float_[0]
        
        # Search in vector database
        results = vectordb.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True
        )
        
        return json({
            "query_image": image_url,
            "results": [
                {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                }
                for match in results.matches
            ]
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

# Search products by text query (using metadata)
@post("/search/text")
async def search_by_text(request: Request):
    try:
        data = await request.json()
        query_text = data.get("query")
        top_k = data.get("top_k", 10)
        
        if not query_text:
            return json({"error": "query is required"}, status=400)
        
        # Search using metadata filter (simple text search in body_html)
        results = vectordb.index.query(
            vector=vectordb.text_to_embedding(query_text).embeddings.float_[0],
            top_k=top_k,
            include_values=False,
            include_metadata=True
        )
        
        return json({
            "query": query_text,
            "results": [
                {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                }
                for match in results.matches
            ]
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

# Get all products (with pagination)
@get("/products")
async def get_products(request: Request):
    try:
        # Get query parameters
        limit = int(request.query.get("limit", "20"))
        offset = int(request.query.get("offset", "0"))
        
        # Query vector database to get products
        results = vectordb.index.query(
            vector=[0.0] * 1024,  # Dummy vector to get all results
            top_k=min(limit, 100),  # Pinecone has limits
            include_metadata=True
        )
        
        return json({
            "products": [
                {
                    "id": match.id,
                    "metadata": match.metadata
                }
                for match in results.matches[offset:offset+limit]
            ],
            "total_returned": len(results.matches),
            "limit": limit,
            "offset": offset
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

# Get specific product by ID
@get("/products/{product_id}")
async def get_product(product_id: str):
    try:
        # Fetch specific product by ID
        results = vectordb.index.fetch(ids=[product_id])
        
        if product_id not in results.vectors:
            return json({"error": "Product not found"}, status=404)
        
        product = results.vectors[product_id]
        
        return json({
            "id": product_id,
            "metadata": product.metadata,
            "values": product.values  # Include embedding values if needed
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

# Delete products (useful for testing)
@delete("/products/{product_id}")
async def delete_product(product_id: str):
    try:
        vectordb.index.delete(ids=[product_id])
        return json({"message": f"Product {product_id} deleted successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

# Get database stats
@get("/stats")
async def get_stats():
    try:
        stats = vectordb.index.describe_index_stats()
        return json({
            "total_vectors": stats.total_vector_count,
            "dimension": stats.dimension,
            "index_fullness": stats.index_fullness,
            "namespaces": dict(stats.namespaces) if stats.namespaces else {}
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@delete("/pending-shorts")
async def delete_pending_short(id: str):
    try:
        global supabase_client
        await supabase_client.delete_pending_short(id)
        return json({"message": "short deleted successfully"})
    except Exception as e:
        return json({"error": str(e)}, status=500)

@post("/comments/update")
async def update_comment(request: Request):
    try:
        data = await request.json()
        
        # Validate required fields
        required_fields = ["channel_id", "comment_id", "text"]
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing required field: {field}"}, status=400)
        
        # Extract fields
        channel_id = data["channel_id"]
        comment_id = data["comment_id"]
        new_text = data["text"]
        video_id = data.get("video_id")  # Optional, but required if comment doesn't exist
        
        from utils.comments import update_comment as yt_update_comment
        
        # Update or create the comment using the YouTube API
        updated_comment = await yt_update_comment(channel_id, comment_id, new_text, video_id)
        
        return json({
            "message": "Comment updated/created successfully",
            "comment": updated_comment
        })
        
    except ValueError as e:
        # Handle specific errors (like missing tokens)
        return json({"error": str(e)}, status=400)
    except Exception as e:
        # Handle unexpected errors
        print(f"Error updating comment: {str(e)}")
        return json({"error": "Failed to update comment"}, status=500)

@post("/create-showcase")
async def create_showcase(request: Request):
    try:
        assert supabase_client

        data = await request.json()

        query = await parse_video(data["url"])
        res = await ps.create_showcase(
            query=json_lib.dumps(query[0]),
            supabase_client=supabase_client
        )

        if not res:
            return json({"error": "Failed to create showcase"}, status=500)

        return json({
            "message": "Showcase created successfully",
            "slug": res
        })
        
    except Exception as e:
        print(f"Error creating showcase: {str(e)}")
        return json({"error": "Failed to create showcase"}, status=500)

@get("/channel/email/{channel_id}")
async def get_channel_email_endpoint(channel_id: str):
    try:
        email = await yt_search.get_channel_email(channel_id)
        if email is not None:
            return json({"channel_id": channel_id, "email": email})
        else:
            return json({"error": "Email not found in channel description"}, status=404)
    except Exception as e:
        return json({"error": str(e)}, status=500)
