from google import genai
from PIL import Image
from io import BytesIO
import requests
from utils.emails import send_email

from dotenv import load_dotenv
load_dotenv()

from utils.supabase import SupabaseClient

from utils.vectordb import query_text
import os

client = genai.Client(api_key=os.getenv("GEMINI_KEY"))


def create_product_grid(image_urls: list[str]) -> list[Image.Image]:
    """Create multiple grid layouts of product images, each containing up to max_images_per_grid products"""
    if not image_urls:
        return []
    
    # Download and process images
    images = []
    for url in image_urls:
        try:
            response = requests.get(url)
            image_data = BytesIO(response.content)
            img = Image.open(image_data)
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
        except Exception as e:
            print(f"Error loading image from URL {url}: {e}")
    
    if not images:
        return []

    if len(images) <= 4:
        return images
    
    # horizontally combine image 5 and 1, image 6 and 2, etc
    for i in range(4, len(images)):
        base_img = images[i - 4]
        new_img = images[i]
        
        # Resize new_img to match base_img height
        new_img = new_img.resize((int(new_img.width * (base_img.height / new_img.height)), base_img.height))
        
        # Create a new image with combined width
        combined_width = base_img.width + new_img.width
        combined_image = Image.new('RGB', (combined_width, base_img.height))
        
        # Paste both images into the combined image
        combined_image.paste(base_img, (0, 0))
        combined_image.paste(new_img, (base_img.width, 0))
        
        images[i - 4] = combined_image

    return images

def gen_showcase_image(prompt, ref_images: list[str]) -> BytesIO: # list of shopify image URLs
    # Create composite grid images from all reference images
    composite_images = create_product_grid(ref_images)
    
    if not composite_images:
        print("Failed to create composite images")
        return None

    response = client.models.generate_content(
        model="gemini-2.5-flash-image-preview",
        contents=[prompt, *composite_images] 
    )

    for part in response.candidates[0].content.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image_data = BytesIO(part.inline_data.data)
            return image_data

def gen_showcase_image_from_products(prompt, products: list[dict]) -> BytesIO:
    image_urls = [p["image"] for p in products if p.get("image")]
    # No limit needed since we're creating a composite image
    return gen_showcase_image(prompt, image_urls)

def choose_best_products(query: str, threshold: float = 0.3, top_k=10): 
    res = query_text(query, top_k)
    # Check if top scoring result is below threshold
    if not res.matches or res.matches[0].score < threshold:
        print(f"Top scoring result ({res.matches[0].score if res.matches else 'N/A'}) is below {threshold} threshold")
        return None
    
    # Extract product metadata from vector search results
    candidate_products = []
    for match in res.matches:
        candidate_products.append({
            "title": match.metadata.get("title", ""),
            "vendor": match.metadata.get("vendor", ""),
            "body_html": match.metadata.get("body_html", ""),
            "image": match.metadata.get("imageURL", ""),
            "score": match.score
        })
    
    # Create prompt for Gemini to choose best products
    products_info = "\n".join([
        f"Product {i+1}: {p['title']} by {p['vendor']} (Score: {p['score']:.3f})"
        for i, p in enumerate(candidate_products)
    ])
    
    prompt = f"""
    Given this user query: "{query}"
    
    Here are the candidate products found:
    {products_info}

    Please select 3-6 products that best match the user's query. 
    Consider synergy, aesthetics, and how well they fit the query.
    
    End your response with Ans; the product numbers (1, 2, 3, etc.) separated by commas and nothing else. If you believe fewer than 3 products are suitable, leave it empty.
    The response is parsed with response_text.split("Ans;")[-1].split(",") and will break if the format is not followed.
    Example response: 
    *Thinking work...*

    Ans; 1, 3, 5
    """
    
    genai_response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt]
    )

    response_text = genai_response.candidates[0].content.parts[0].text
    print("Gemini response:", response_text.strip())
    
    # Parse the response to get selected product indices
    selected_indices = []
    try:
        indices = [int(x.strip()) - 1 for x in response_text.split("Ans;")[-1].split(",")]
        if len(indices) < 3:
            print("Gemini selected fewer than 3 products")
            return None
        selected_indices = [i for i in indices if 0 <= i < len(candidate_products)]
    except (ValueError, IndexError):
        return None

    
    # Return the selected products
    return [candidate_products[i] for i in selected_indices[:top_k]]

async def create_showcase(query: str, supabase_client: SupabaseClient):
    chosen_products = choose_best_products(query, top_k=10)
    if chosen_products is None or len(chosen_products) < 3:
        print("Not enough suitable products found, bad video")
        return False
    print(len(chosen_products))
    prompt = """You are a master photographer and product stylist. You are tasked with creating an appealing, aesthetic, 3D product showcase. 
    Match the environment to the theme of the products. Frame 1 or 2 products as the main focus with the others supporting. The scene is a realistic photoshoot which means no floating products without support.
    Make sure the lighting and colors complement the products. The angle of the camera can be anything visually interesting.
    Pay attention to the arrangement of the products, spacing, and overall composition to create a visually appealing scene."""
    res = gen_showcase_image_from_products(prompt, chosen_products)
    public_url = await supabase_client.upload_image_to_supabase(res, "product")

    # Generate combined title and description using Gemini
    product_titles = [p["title"] for p in chosen_products]
    combined_title_prompt = f"""
    Given these product titles: {', '.join(product_titles)}
    
    Create a catchy, concise title that combines all these products into one cohesive showcase name. 
    Then create a brief description (1-2 sentences) that describes what this product collection offers.
    
    Format your response exactly as: Title;;; Description
    
    Example: "Ultimate Tech Workspace Bundle;;; A complete collection of premium devices and accessories designed to elevate your productivity and workspace aesthetics."
    """
    
    title_response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[combined_title_prompt]
    )
    
    title_and_description = title_response.candidates[0].content.parts[0].text.strip()
    
    # Parse title and description
    try:
        title, description = title_and_description.split(";;;")
        title = title.strip()
        description = description.strip()
    except ValueError:
        # Fallback if parsing fails
        title = " + ".join(product_titles[:3])  # Use first 3 product titles
        description = f"A curated collection featuring {', '.join(product_titles)}"
    
    row = await supabase_client.post_product_row(
        title=title,
        showcase_images=[p["image"] for p in chosen_products if p["image"]],
        products={ "products": chosen_products, "description": description },
        main_image_url=public_url
    )

    # send_email("Maatchaa sponsorshhip", ""+row.get("slug", None), "aayankarmali@gmail.com")