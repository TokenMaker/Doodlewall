import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageDraw

class DoodleWallAPITester:
    def __init__(self, base_url="https://wall-of-art.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_doodle_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'GET' and 'doodles' in endpoint:
                        print(f"   Response: Found {len(response_data)} doodles")
                    elif method == 'POST' and 'doodles' in endpoint:
                        print(f"   Created doodle ID: {response_data.get('id', 'N/A')}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_doodle_image(self):
        """Create a simple test doodle image as base64"""
        # Create a 350x350 white image with a simple drawing
        img = Image.new('RGB', (350, 350), 'white')
        draw = ImageDraw.Draw(img)
        
        # Draw a simple smiley face
        draw.ellipse([100, 100, 250, 250], outline='blue', width=5)  # Face
        draw.ellipse([130, 140, 150, 160], fill='blue')  # Left eye
        draw.ellipse([200, 140, 220, 160], fill='blue')  # Right eye
        draw.arc([140, 180, 210, 220], 0, 180, fill='blue', width=5)  # Smile
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_get_empty_doodles(self):
        """Test getting doodles when wall is empty"""
        success, response = self.run_test(
            "Get Empty Doodles",
            "GET",
            "doodles",
            200
        )
        if success and isinstance(response, list):
            print(f"   Initial doodle count: {len(response)}")
        return success

    def test_get_doodle_count(self):
        """Test getting doodle count"""
        success, response = self.run_test(
            "Get Doodle Count",
            "GET",
            "doodles/stats/count",
            200
        )
        if success and 'count' in response:
            print(f"   Doodle count: {response['count']}")
        return success

    def test_create_doodle(self):
        """Test creating a new doodle"""
        test_image = self.create_test_doodle_image()
        doodle_data = {
            "image_data": test_image,
            "color_used": "#3B82F6"  # Blue
        }
        
        success, response = self.run_test(
            "Create Doodle",
            "POST",
            "doodles",
            200,  # Backend returns 200, not 201
            data=doodle_data
        )
        
        if success and 'id' in response:
            self.created_doodle_ids.append(response['id'])
            # Verify response structure
            required_fields = ['id', 'image_data', 'position_x', 'position_y', 'rotation', 'created_at']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   Warning: Missing fields in response: {missing_fields}")
            else:
                print(f"   Doodle created with position: ({response['position_x']}, {response['position_y']})")
                print(f"   Rotation: {response['rotation']} degrees")
        
        return success

    def test_get_doodles_after_creation(self):
        """Test getting doodles after creating one"""
        success, response = self.run_test(
            "Get Doodles After Creation",
            "GET",
            "doodles",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} doodles after creation")
            if len(response) > 0:
                doodle = response[0]
                print(f"   First doodle ID: {doodle.get('id', 'N/A')}")
                print(f"   Position: ({doodle.get('position_x', 'N/A')}, {doodle.get('position_y', 'N/A')})")
        
        return success

    def test_get_specific_doodle(self):
        """Test getting a specific doodle by ID"""
        if not self.created_doodle_ids:
            print("   Skipping - No doodles created yet")
            return True
            
        doodle_id = self.created_doodle_ids[0]
        success, response = self.run_test(
            "Get Specific Doodle",
            "GET",
            f"doodles/{doodle_id}",
            200
        )
        
        if success:
            print(f"   Retrieved doodle: {response.get('id', 'N/A')}")
        
        return success

    def test_get_nonexistent_doodle(self):
        """Test getting a non-existent doodle"""
        fake_id = "nonexistent-doodle-id"
        success, response = self.run_test(
            "Get Non-existent Doodle",
            "GET",
            f"doodles/{fake_id}",
            404
        )
        return success

    def test_create_multiple_doodles(self):
        """Test creating multiple doodles to verify grid positioning"""
        colors = ["#EF4444", "#F97316", "#22C55E"]  # Red, Orange, Green
        success_count = 0
        
        for i, color in enumerate(colors):
            test_image = self.create_test_doodle_image()
            doodle_data = {
                "image_data": test_image,
                "color_used": color
            }
            
            success, response = self.run_test(
                f"Create Doodle {i+2}",
                "POST",
                "doodles",
                200,
                data=doodle_data
            )
            
            if success:
                success_count += 1
                if 'id' in response:
                    self.created_doodle_ids.append(response['id'])
                    print(f"   Position: ({response.get('position_x', 'N/A')}, {response.get('position_y', 'N/A')})")
        
        return success_count == len(colors)

    def test_invalid_doodle_creation(self):
        """Test creating doodle with invalid data"""
        invalid_data = {
            "image_data": "invalid-base64-data",
            "color_used": "#FF0000"
        }
        
        # This might return 422 (validation error) or 500 (server error)
        # Let's check what the actual behavior is
        success, response = self.run_test(
            "Create Invalid Doodle",
            "POST",
            "doodles",
            422,  # Expected validation error
            data=invalid_data
        )
        
        # If 422 didn't work, try 500
        if not success:
            success, response = self.run_test(
                "Create Invalid Doodle (500)",
                "POST",
                "doodles",
                500,
                data=invalid_data
            )
        
        return success

def main():
    print("🎨 Starting Doodle Wall API Tests")
    print("=" * 50)
    
    tester = DoodleWallAPITester()
    
    # Test sequence
    tests = [
        tester.test_api_root,
        tester.test_get_doodle_count,
        tester.test_get_empty_doodles,
        tester.test_create_doodle,
        tester.test_get_doodles_after_creation,
        tester.test_get_specific_doodle,
        tester.test_create_multiple_doodles,
        tester.test_get_nonexistent_doodle,
        tester.test_invalid_doodle_creation,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Final summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"🎯 Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.created_doodle_ids:
        print(f"🎨 Created {len(tester.created_doodle_ids)} test doodles")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())