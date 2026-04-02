from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
import base64
import re
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from openai import AsyncOpenAI
import hashlib

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-key')
JWT_ALGORITHM = "HS256"

# Rate limiting config
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024  # 2MB max image size

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# Rate limiting helpers
def get_rate_limit_key(ip: str, email: str) -> str:
    """Generate a unique key for rate limiting based on IP and email"""
    return hashlib.sha256(f"{ip}:{email}".encode()).hexdigest()


async def check_rate_limit(ip: str, email: str) -> tuple[bool, int]:
    """Check if login is rate limited. Returns (is_locked, remaining_attempts)"""
    key = get_rate_limit_key(ip, email)
    
    record = await db.login_attempts.find_one({"key": key}, {"_id": 0})
    
    if not record:
        return False, MAX_LOGIN_ATTEMPTS
    
    # Check if lockout has expired
    if record.get("locked_until"):
        locked_until = datetime.fromisoformat(record["locked_until"])
        if datetime.now(timezone.utc) < locked_until:
            return True, 0
        else:
            # Lockout expired, reset
            await db.login_attempts.delete_one({"key": key})
            return False, MAX_LOGIN_ATTEMPTS
    
    attempts = record.get("attempts", 0)
    return False, MAX_LOGIN_ATTEMPTS - attempts


async def record_failed_login(ip: str, email: str):
    """Record a failed login attempt"""
    key = get_rate_limit_key(ip, email)
    
    record = await db.login_attempts.find_one({"key": key}, {"_id": 0})
    
    if not record:
        await db.login_attempts.insert_one({
            "key": key,
            "attempts": 1,
            "first_attempt": datetime.now(timezone.utc).isoformat()
        })
    else:
        attempts = record.get("attempts", 0) + 1
        
        if attempts >= MAX_LOGIN_ATTEMPTS:
            # Lock the account
            locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            await db.login_attempts.update_one(
                {"key": key},
                {"$set": {"attempts": attempts, "locked_until": locked_until.isoformat()}}
            )
        else:
            await db.login_attempts.update_one(
                {"key": key},
                {"$set": {"attempts": attempts}}
            )


async def clear_login_attempts(ip: str, email: str):
    """Clear login attempts after successful login"""
    key = get_rate_limit_key(ip, email)
    await db.login_attempts.delete_one({"key": key})


# JWT Token functions
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Auth dependency
async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.admins.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Admin not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Define Models
class DoodleCreate(BaseModel):
    image_data: str
    color_used: Optional[str] = None
    
    @field_validator('image_data')
    @classmethod
    def validate_image_data(cls, v):
        if not v:
            raise ValueError('image_data is required')
        
        data_url_pattern = r'^data:image/(png|jpeg|jpg|webp);base64,'
        match = re.match(data_url_pattern, v)
        
        if not match:
            raise ValueError('image_data must be a valid base64 data URL')
        
        base64_data = re.sub(data_url_pattern, '', v)
        
        try:
            decoded = base64.b64decode(base64_data)
            # Check image size (max 2MB)
            if len(decoded) > MAX_IMAGE_SIZE_BYTES:
                raise ValueError(f'Image too large. Maximum size is {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB')
        except Exception as e:
            if 'too large' in str(e):
                raise e
            raise ValueError('Invalid base64 encoding in image_data')
        
        return v


class Doodle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_data: str
    color_used: Optional[str] = None
    position_x: int = 0
    position_y: int = 0
    rotation: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DoodleResponse(BaseModel):
    id: str
    image_data: str
    color_used: Optional[str] = None
    position_x: int
    position_y: int
    rotation: float
    created_at: str


class AdminLogin(BaseModel):
    email: str
    password: str


class DeleteDoodlesRequest(BaseModel):
    doodle_ids: List[str]


# Helper to calculate next position avoiding overlaps
async def calculate_next_position():
    import random
    
    # Get all existing doodle positions
    existing_doodles = await db.doodles.find({}, {"_id": 0, "position_x": 1, "position_y": 1}).to_list(1000)
    
    doodle_size = 350
    min_distance = 300  # Minimum distance between doodle centers to avoid overlap
    
    # Define viewable area (reasonable wall size that users will see)
    wall_width = 3000
    wall_height = 2000
    margin = 50  # Keep doodles away from edges
    
    max_attempts = 100
    
    for _ in range(max_attempts):
        # Generate random position within viewable area
        new_x = random.randint(margin, wall_width - doodle_size - margin)
        new_y = random.randint(margin, wall_height - doodle_size - margin)
        
        # Check if this position overlaps with any existing doodle
        overlaps = False
        for existing in existing_doodles:
            ex_x = existing.get('position_x', 0)
            ex_y = existing.get('position_y', 0)
            
            # Calculate distance between centers
            distance = ((new_x - ex_x) ** 2 + (new_y - ex_y) ** 2) ** 0.5
            
            if distance < min_distance:
                overlaps = True
                break
        
        if not overlaps:
            # Found a non-overlapping position
            rotation = random.uniform(-5, 5)
            return new_x, new_y, rotation
    
    # If we couldn't find a non-overlapping spot, expand the wall
    # Place in a new row below existing content
    if existing_doodles:
        max_y = max(d.get('position_y', 0) for d in existing_doodles)
        new_y = max_y + doodle_size + 50
    else:
        new_y = margin
    
    new_x = random.randint(margin, wall_width - doodle_size - margin)
    rotation = random.uniform(-5, 5)
    
    return new_x, new_y, rotation


# Content moderation
async def check_content_appropriate(image_base64: str) -> tuple[bool, str]:
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY', os.environ.get('OPENAI_API_KEY'))
        if not api_key:
            logger.warning("No EMERGENT_LLM_KEY found, skipping content moderation")
            return True, ""
        
        base64_data = re.sub(r'^data:image/[^;]+;base64,', '', image_base64)
        mime_type = "image/jpeg"
        if "data:image/" in image_base64:
            mime_type = image_base64.split(";")[0].split(":")[1]
            
        client = AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a content moderation assistant. Analyze images and determine if they contain inappropriate content such as: nudity, explicit sexual content, violence, gore, hate symbols, or offensive imagery. Respond ONLY with 'SAFE' if the image is appropriate, or 'UNSAFE: [brief reason]' if it contains inappropriate content."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this doodle image for inappropriate content. Is it safe to display publicly?"},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_data}"}}
                    ]
                }
            ],
            max_tokens=100
        )
        
        result = response.choices[0].message.content
        
        if result.upper().startswith("SAFE"):
            return True, ""
        elif result.upper().startswith("UNSAFE"):
            reason = result.split(":", 1)[1].strip() if ":" in result else "Content flagged as inappropriate"
            return False, reason
        else:
            return True, ""
            
    except Exception as e:
        logger.error(f"Content moderation error: {e}")
        return True, ""


# Admin seeding
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@doodlewall.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.admins.find_one({"email": admin_email}, {"_id": 0})
    
    if existing is None:
        admin_id = str(uuid.uuid4())
        hashed = hash_password(admin_password)
        await db.admins.insert_one({
            "id": admin_id,
            "email": admin_email,
            "password_hash": hashed,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.admins.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")


# Routes
@api_router.get("/")
async def root():
    return {"message": "Doodle Wall API"}


# Auth routes
@api_router.post("/auth/login")
async def admin_login(input: AdminLogin, request: Request):
    email = input.email.lower().strip()
    
    # Get client IP
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Check rate limiting
    is_locked, remaining = await check_rate_limit(client_ip, email)
    if is_locked:
        raise HTTPException(
            status_code=429, 
            detail=f"Too many failed attempts. Please try again in {LOCKOUT_DURATION_MINUTES} minutes."
        )
    
    admin = await db.admins.find_one({"email": email}, {"_id": 0})
    
    if not admin or not verify_password(input.password, admin.get("password_hash", "")):
        await record_failed_login(client_ip, email)
        remaining -= 1
        if remaining <= 0:
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed attempts. Please try again in {LOCKOUT_DURATION_MINUTES} minutes."
            )
        raise HTTPException(status_code=401, detail=f"Invalid email or password. {remaining} attempts remaining.")
    
    # Clear failed attempts on successful login
    await clear_login_attempts(client_ip, email)
    
    access_token = create_access_token(admin["id"], admin["email"])
    
    return {
        "id": admin["id"],
        "email": admin["email"],
        "role": admin.get("role", "admin"),
        "access_token": access_token
    }


@api_router.post("/auth/logout")
async def admin_logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}


@api_router.get("/auth/me")
async def get_me(admin: dict = Depends(get_current_admin)):
    return {
        "id": admin["id"],
        "email": admin["email"],
        "role": admin.get("role", "admin")
    }


# Doodle routes
@api_router.post("/doodles", response_model=DoodleResponse)
async def create_doodle(input: DoodleCreate):
    is_safe, rejection_reason = await check_content_appropriate(input.image_data)
    if not is_safe:
        raise HTTPException(
            status_code=400,
            detail=f"Doodle rejected: {rejection_reason}. Please create appropriate content."
        )
    
    position_x, position_y, rotation = await calculate_next_position()
    
    doodle = Doodle(
        image_data=input.image_data,
        color_used=input.color_used,
        position_x=position_x,
        position_y=position_y,
        rotation=rotation
    )
    
    doc = doodle.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.doodles.insert_one(doc)
    
    return DoodleResponse(
        id=doodle.id,
        image_data=doodle.image_data,
        color_used=doodle.color_used,
        position_x=doodle.position_x,
        position_y=doodle.position_y,
        rotation=doodle.rotation,
        created_at=doc['created_at']
    )


@api_router.get("/doodles", response_model=List[DoodleResponse])
async def get_doodles():
    doodles = await db.doodles.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    return [
        DoodleResponse(
            id=d['id'],
            image_data=d['image_data'],
            color_used=d.get('color_used'),
            position_x=d['position_x'],
            position_y=d['position_y'],
            rotation=d['rotation'],
            created_at=d['created_at'] if isinstance(d['created_at'], str) else d['created_at'].isoformat()
        )
        for d in doodles
    ]


@api_router.get("/doodles/{doodle_id}", response_model=DoodleResponse)
async def get_doodle(doodle_id: str):
    doodle = await db.doodles.find_one({"id": doodle_id}, {"_id": 0})
    
    if not doodle:
        raise HTTPException(status_code=404, detail="Doodle not found")
    
    return DoodleResponse(
        id=doodle['id'],
        image_data=doodle['image_data'],
        color_used=doodle.get('color_used'),
        position_x=doodle['position_x'],
        position_y=doodle['position_y'],
        rotation=doodle['rotation'],
        created_at=doodle['created_at'] if isinstance(doodle['created_at'], str) else doodle['created_at'].isoformat()
    )


@api_router.delete("/doodles/{doodle_id}")
async def delete_doodle(doodle_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.doodles.delete_one({"id": doodle_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Doodle not found")
    
    return {"message": "Doodle deleted successfully"}


@api_router.post("/doodles/bulk-delete")
async def delete_multiple_doodles(request: DeleteDoodlesRequest, admin: dict = Depends(get_current_admin)):
    if not request.doodle_ids:
        raise HTTPException(status_code=400, detail="No doodle IDs provided")
    
    result = await db.doodles.delete_many({"id": {"$in": request.doodle_ids}})
    
    return {"message": f"Deleted {result.deleted_count} doodles"}


@api_router.delete("/admin/doodles/all")
async def delete_all_doodles(admin: dict = Depends(get_current_admin)):
    result = await db.doodles.delete_many({})
    return {"message": f"Deleted all {result.deleted_count} doodles"}


@api_router.get("/doodles/stats/count")
async def get_doodle_count():
    count = await db.doodles.count_documents({})
    return {"count": count}


# Include the router
app.include_router(api_router)

# CORS - Need specific origin for credentials
frontend_url = os.environ.get('FRONTEND_URL', 'https://wall-of-art.preview.emergentagent.com')
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[frontend_url, "http://localhost:3000", "https://doodlewall.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    await seed_admin()
    # Create indexes
    await db.admins.create_index("email", unique=True)
    await db.admins.create_index("id", unique=True)
    await db.login_attempts.create_index("key", unique=True)
    # TTL index to auto-expire login attempt records after 1 hour
    await db.login_attempts.create_index(
        "first_attempt", 
        expireAfterSeconds=3600
    )
    
    # Write test credentials (using relative path instead of absolute /app)
    credentials_dir = ROOT_DIR / "memory"
    credentials_dir.mkdir(parents=True, exist_ok=True)
    with open(credentials_dir / "test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {os.environ.get('ADMIN_EMAIL', 'admin@doodlewall.com')}\n")
        f.write(f"- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
