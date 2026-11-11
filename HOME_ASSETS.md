# HOME_ASSETS.md — Porch Light Home Asset Slots Specification

Place your custom photography inside `public/home/` using the exact slot filenames shown below (for example, `public/home/intro.carousel1.jpg`). The app will automatically detect local files and prefer them over stock fallbacks.

For the Hero cutout, place files inside `public/hero/`:
- `public/hero/hero-bg.jpg`
- `public/hero/hero-house.png` (transparent background where sky is removed)
- `public/preloader/preloader.gif` (centered preloader animation)

---

| Slot Name | File Path in `public/` | Recommended Size | Ratio | Description & Notes |
|:---|:---|:---|:---|:---|
| **hero.bg** | `public/hero/hero-bg.jpg` (or `public/home/hero.bg.jpg`) | 2560 × 1440 px | 16:9 | Full-bleed hero background with sky, house, landscape, warm natural sunlight. |
| **hero.house** | `public/hero/hero-house.png` (or `public/home/hero.house.png`) | 2560 × 1440 px | 16:9 (PNG) | Identical to hero-bg but with the SKY REMOVED (transparent) so wordmark slips behind roof/trees. |
| **intro.carousel1** | `public/home/intro.carousel1.jpg` | 600 × 800 px | 3:4 (Narrow) | Architectural interior (living area / courtyard), warm and bright. |
| **intro.carousel2** | `public/home/intro.carousel2.jpg` | 1200 × 800 px | 3:2 (Wide) | Modern home exterior with porch / terrace. |
| **intro.carousel3** | `public/home/intro.carousel3.jpg` | 800 × 800 px | 1:1 (Medium) | Sunlit minimalist room / architectural detail. |
| **intro.carousel4** | `public/home/intro.carousel4.jpg` | 1200 × 800 px | 3:2 (Wide) | Elegant tropical villa or coastal veranda. |
| **intro.carousel5** | `public/home/intro.carousel5.jpg` | 600 × 800 px | 3:4 (Narrow) | Bright empty room with light pouring through windows. |
| **intro.gallery1** | `public/home/intro.gallery1.jpg` | 900 × 1200 px | 3:4 (Portrait) | High-end living room interior with warm textures. |
| **intro.gallery2** | `public/home/intro.gallery2.jpg` | 900 × 1200 px | 3:4 (Portrait) | Contemporary dining or kitchen nook with soft morning light. |
| **intro.gallery3** | `public/home/intro.gallery3.jpg` | 900 × 1200 px | 3:4 (Portrait) | Quiet bedroom or study overlooking greenery. |
| **top.1** | `public/home/top.1.jpg` | 1200 × 800 px | 3:2 | Featured property 1 (defaults to mock property data if unprovided). |
| **top.2** | `public/home/top.2.jpg` | 1200 × 800 px | 3:2 | Featured property 2 (defaults to mock property data if unprovided). |
| **top.3** | `public/home/top.3.jpg` | 1200 × 800 px | 3:2 | Featured property 3 (defaults to mock property data if unprovided). |
| **top.4** | `public/home/top.4.jpg` | 1200 × 800 px | 3:2 | Featured property 4 (defaults to mock property data if unprovided). |
| **paths.exterior** | `public/home/paths.exterior.jpg` | 1920 × 1080 px | 16:9 | Striking exterior of an Indian contemporary residence. |
| **features.1** | `public/home/features.1.jpg` | 1200 × 900 px | 4:3 | Verified documentation & RERA clarity scene. |
| **features.2** | `public/home/features.2.jpg` | 1200 × 900 px | 4:3 | 360-degree virtual walkthrough or bright interior view. |
| **features.3** | `public/home/features.3.jpg` | 1200 × 900 px | 4:3 | Scheduled site visit or personal walkthrough. |
| **features.4** | `public/home/features.4.jpg` | 1200 × 900 px | 4:3 | Transparent financial pricing and EMI breakdown scene. |
| **features.5** | `public/home/features.5.jpg` | 1200 × 900 px | 4:3 | Digital escrow & secure token agreement handshake. |
| **reviews.interior** | `public/home/reviews.interior.jpg` | 1600 × 1000 px | 16:10 (or 16:9) | Lived-in serene home interior with warm atmospheric lighting. |
| **journal.1** | `public/home/journal.1.jpg` | 1600 × 900 px | 16:9 | Rental agreement & deposit guide editorial image. |
| **journal.2** | `public/home/journal.2.jpg` | 1600 × 900 px | 16:9 | RERA listing compliance & carpet area checklist editorial image. |
| **journal.3** | `public/home/journal.3.jpg` | 1600 × 900 px | 16:9 | 360-degree virtual walkthrough & room connectivity editorial image. |
| **agent.desk** | `public/home/agent.desk.jpg` | 1400 × 900 px | 14:9 (or 16:10) | Calm modern desk / consulting workspace with warm wood & paper. |

---

### Preloader Asset
- `public/preloader/preloader.gif`: max 320 px wide, ~3 s duration, under 2 MB. If absent, a built-in serif pulsing dot animation displays automatically.

---

### Local Stock Photo Credits (Downloaded into public/home/)
All photos downloaded from Unsplash (free license for commercial and personal use):
- `intro.carousel1`: Spacejoy / Interior Living Area
- `intro.carousel2`: Ralph (Ravi) Kayden / Villa Exterior
- `intro.carousel3`: Hutomo Abrianto / Sunlit Minimalist Room
- `intro.carousel4`: R. (Ravi) Kayden / Contemporary Villa
- `intro.carousel5`: Spacejoy / Modern Interior Study
- `intro.gallery1`: Spacejoy / Bespoke Living Room
- `intro.gallery2`: Ralph (Ravi) Kayden / Dining & Kitchen
- `intro.gallery3`: R. (Ravi) Kayden / Bedroom Suite
- `top.1` to `top.4`: R. Kayden, Avi Waxman, Patrick Perkins / Indian Metro Residences
- `paths.exterior`: Ralph (Ravi) Kayden / Contemporary Architecture
- `features.1` to `features.5`: Francesca Tosolini, R. Kayden, Spacejoy, Douglas Sheppard / Interior & Architectural Scenes
- `reviews.interior`: Spacejoy / Serene Residence Living Space
- `journal.1` to `journal.3`: R. Kayden, Avi Waxman, Huy Nguyen / Editorial Architecture
- `agent.desk`: Copernico / Consulting Workspace

