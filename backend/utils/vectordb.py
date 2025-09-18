import cohere
from pinecone import Pinecone
import requests
import base64
import os
import time
from typing import List, Dict, Any, TypedDict, Optional

from utils.shopify import Product

class ImageUrlContent(TypedDict):
    type: str
    image_url: Dict[str, str]

class ContentItem(TypedDict):
    content: List[ImageUrlContent]

class Metadata(TypedDict):
    body_html: str
    title: str
    vendor: str
    imageURL: str
    price: float

class EmbeddingItem(TypedDict):
    id: str
    values: List[float]
    metadata: Metadata


COHERE_KEY=os.getenv("COHERE_KEY")
if not COHERE_KEY:
    raise ValueError("Missing COHERE_KEY in environment variables")
co = cohere.ClientV2(COHERE_KEY)
PINECONE_KEY=os.getenv("PINECONE_KEY")
if not PINECONE_KEY:
    raise ValueError("Missing PINECONE_KEY in environment variables")
pc = Pinecone(api_key=PINECONE_KEY, environment="us-east1-gcp")
INDEX_NAME=os.getenv("INDEX_NAME")
if not INDEX_NAME:
    raise ValueError("Missing INDEX_NAME in environment variables")
index = pc.Index(INDEX_NAME)

def imageurl_to_b64(image_url: str) -> str:
    image = requests.get(image_url)
    stringified_buffer = base64.b64encode(image.content).decode("utf-8")
    content_type = image.headers["Content-Type"]
    return f"data:{content_type};base64,{stringified_buffer}"

def imageurl_to_input(image_url: str) -> List[ContentItem]:
    image_base64 = imageurl_to_b64(image_url)
    return [{
        "content": [
            {
                "type": "image_url",
                  "image_url": {"url": image_base64}
              }
          ],
      }]
  
def imageurl_to_embedding(image_url: str) -> Any:
  return co.embed(
      model="embed-english-v3.0",
      input_type="image",
      embedding_types=["float"],
      inputs=imageurl_to_input(image_url)
  )

def text_to_embedding(text: str) -> Any:
    return co.embed(
        model="embed-english-v3.0",
        input_type="search_query",
        embedding_types=["float"],
        inputs=[{"content": [
            {"type": "text", "text": text},
        ]}]
    )

def embed_products(products: List[Product]) -> List[EmbeddingItem]:
    items: List[EmbeddingItem] = []

    for i, product in enumerate(products):
        items.append({
            "id": str(i),
            "values": imageurl_to_embedding(product["image"]).embeddings.float_[0],
            "metadata": {
                "body_html": product["body_html"],
                "title": product["name"],
                "vendor": product["vendor"],
                "imageURL": product["image"],
                "price": product["price"]
            }
        })
        time.sleep(0.2)
    return items

def upsert_embeddings(items: List[EmbeddingItem]) -> None:
    index.upsert(vectors=items)

def query_embeddings(vector: List[float], top_k: int = 10) -> Any:
    return index.query(
        vector=vector,
        top_k=top_k,
        include_metadata=True
    )

def query_text(text: str, top_k: int = 10) -> Any:
    text_embedding = text_to_embedding(text).embeddings.float_[0]
    return query_embeddings(text_embedding, top_k=top_k)
