import requests
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

def create_test_image_with_text(text):
    """Create a test image with text for content moderation testing"""
    img = Image.new('RGB', (350, 350), 'white')
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        font = ImageFont.load_default()
    
    # Draw text in the center
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (350 - text_width) // 2
    y = (350 - text_height) // 2
    
    draw.text((x, y), text, fill='black', font=font)
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def test_content_moderation():
    """Test content moderation functionality"""
    base_url = "https://wall-of-art.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing Content Moderation...")
    
    # Test 1: Safe content (should pass)
    print("\n1. Testing safe content...")
    safe_image = create_test_image_with_text("Hello World!")
    safe_data = {
        "image_data": safe_image,
        "color_used": "#000000"
    }
    
    try:
        response = requests.post(f"{api_url}/doodles", json=safe_data, timeout=30)
        if response.status_code == 200:
            print("✅ Safe content accepted")
            result = response.json()
            print(f"   Created doodle ID: {result.get('id', 'N/A')}")
        else:
            print(f"❌ Safe content rejected: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Error testing safe content: {e}")
    
    # Test 2: Potentially inappropriate content (should be flagged)
    print("\n2. Testing potentially inappropriate content...")
    inappropriate_image = create_test_image_with_text("VIOLENCE")
    inappropriate_data = {
        "image_data": inappropriate_image,
        "color_used": "#FF0000"
    }
    
    try:
        response = requests.post(f"{api_url}/doodles", json=inappropriate_data, timeout=30)
        if response.status_code == 400:
            print("✅ Inappropriate content correctly rejected")
            error_data = response.json()
            print(f"   Rejection reason: {error_data.get('detail', 'No detail provided')}")
        elif response.status_code == 200:
            print("⚠️  Inappropriate content was accepted (moderation may be lenient)")
            result = response.json()
            print(f"   Created doodle ID: {result.get('id', 'N/A')}")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Error testing inappropriate content: {e}")
    
    # Test 3: Test with empty/invalid image
    print("\n3. Testing invalid image data...")
    invalid_data = {
        "image_data": "data:image/png;base64,invalid",
        "color_used": "#000000"
    }
    
    try:
        response = requests.post(f"{api_url}/doodles", json=invalid_data, timeout=10)
        if response.status_code in [400, 422]:
            print("✅ Invalid image data correctly rejected")
            error_data = response.json()
            print(f"   Error: {error_data.get('detail', 'No detail provided')}")
        else:
            print(f"❌ Invalid image data not properly handled: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing invalid image: {e}")

if __name__ == "__main__":
    test_content_moderation()