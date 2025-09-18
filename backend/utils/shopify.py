import requests
from typing import List, Dict, Any, Optional, TypedDict

class Product(TypedDict):
    name: str
    price: float
    image: str
    body_html: str
    vendor: str

def get_products(shop_url: str) -> List[Product]:
    res = requests.get("https://" + shop_url + "/products.json")
    data = res.json()
    simplified_products: List[Product] = []
    for product in data.get("products", []):
        product_name = product.get("title")
        body_html = product.get("body_html")
        price = 20.0
        if product.get("variants") is None or len(product.get("variants")) == 0:
            price = product.get("variants")[0].get("price")
        image_src = ""
        if product.get("images"):
            image_src = product.get("images")[0].get("src", "")
        simplified_products.append({
            "name": product_name,
            "price": price,
            "image": image_src,
            "body_html": body_html,
            "vendor": shop_url
        })

    return simplified_products
