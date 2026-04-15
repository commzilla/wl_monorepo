import requests

def upload_to_bunnycdn(file, filename):
    """
    Upload a file to BunnyCDN via HTTP API using raw credentials.

    Args:
        file: Django InMemoryUploadedFile or File object
        filename: str, path inside BunnyCDN (e.g., 'offers/image.jpg')

    Returns:
        str: Public CDN URL
    """
    # --- 🔐 Replace with your actual BunnyCDN details ---
    STORAGE_ZONE = 'we-fund'
    ACCESS_KEY = '273e3774-34b8-4dca-92a3b1f74e6d-de67-4928'  # 👈 Not your global API key
    REGION = ''  # Empty string for Frankfurt (DE)
    CDN_BASE_URL = 'https://we-fund.b-cdn.net'  # Your pull zone URL

    base_url = f"{REGION + '.' if REGION else ''}storage.bunnycdn.com"
    upload_url = f"https://{base_url}/{STORAGE_ZONE}/{filename}"

    headers = {
        "AccessKey": ACCESS_KEY,
        "Content-Type": "application/octet-stream"
    }

    response = requests.put(upload_url, headers=headers, data=file.read())

    if response.status_code == 201:
        return f"{CDN_BASE_URL.rstrip('/')}/{filename}"
    else:
        raise Exception(f"❌ BunnyCDN upload failed: {response.status_code} {response.text}")
