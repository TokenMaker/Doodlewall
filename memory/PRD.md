# Doodle Wall - Product Requirements Document

## Original Problem Statement
A site where users can doodle and have it be added to a large doodle wall. The wall updated with doodles from users. It looks like a giant wall that others can also explore. Intro page is the wall with all current doodles. There is an Add your doodle button. A pop up will appear with space for a square canvas for the user for draw their doodle. They will have option to select the color. Brush size will all the same so it can all be uniform across. There will be a button saying done or put on wall that will add the doodle to a free space on the wall. The doodles on the wall will be placed on a grid like pattern with a slight overlay on each other to feel placed on. UI should be playful but only use white and black as the doodles and wall will be the ones with color.

## User Choices
- Canvas Size: 350x350px
- Color Palette: 8 colors (red, orange, yellow, green, blue, purple, pink, brown)
- Storage: Persistent MongoDB
- Navigation: Infinite scroll/pan with zoom and click to enlarge

## Architecture
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Frontend**: React with react-zoom-pan-pinch, framer-motion
- **Database**: MongoDB collection `doodles`

## What's Been Implemented (April 2026)
- [x] Doodle Wall with pan/zoom navigation
- [x] Drawing modal with 350x350 canvas
- [x] 8 color picker (Black, Red, Orange, Yellow, Green, Blue, Purple, Pink)
- [x] Thicker brush size (12px) - default color black
- [x] Grid placement with random rotation (-5° to +5°)
- [x] Click to enlarge doodle
- [x] Persistent storage in MongoDB
- [x] Neobrutalist B&W UI (Fredoka + Nunito fonts)
- [x] Input validation for base64 image data
- [x] Doodle count display
- [x] Clean white wall background (no dot pattern)
- [x] Borderless doodles on wall
- [x] AI content moderation filter (GPT-4o-mini vision)
- [x] Admin panel with JWT authentication
- [x] Admin: Delete selected doodles
- [x] Admin: Delete all doodles
- [x] Help tooltip (dismissible, stored in localStorage)

## API Endpoints
- `GET /api/doodles` - Get all doodles
- `POST /api/doodles` - Create new doodle
- `GET /api/doodles/{id}` - Get specific doodle
- `DELETE /api/doodles/{id}` - Delete doodle
- `GET /api/doodles/stats/count` - Get doodle count

## Prioritized Backlog
### P0 (Critical)
- All implemented ✅

### P1 (Important)
- [ ] Touch gesture support for mobile drawing
- [ ] Loading state for doodle submission

### P2 (Nice to have)
- [ ] Undo/redo for drawing
- [ ] Different brush sizes
- [ ] Share specific doodle via URL
- [ ] Report inappropriate doodle
