# Leslie McCoy — media slots

No photography of Leslie is in this repo yet. Every image slot on the homepage currently
holds a stand-in court/detail photo shown as a green→aubergine duotone with a "Photo slot" tag,
so nothing reads as Leslie's own image. **Do not substitute photos of other people.**

## 1. Media audit (do this before dropping files in)

Review every pickleball image Leslie supplies (Facebook, phone, tournament organisers) and rank it:

| Rank | Meaning | Use |
|---|---|---|
| **A** | Hero / campaign quality — Leslie is the clear focal point, sharp, good light, room to crop | `hero`, `about-portrait`, `gallery-feature` |
| **B** | Achievement / editorial — medal or podium shots, match action, club opening | `xp-*`, `gallery-compete` |
| **C** | Community support — groups, clinics, partners, events | `gallery-community`, `xp-1`, `coaching` slots |
| **D** | Do not use — blurry, cluttered, other people as the subject, heavy filters, screenshots | — |

Use only the strongest **6–10**. Don't dump the whole album.

## 2. Slots

| Slot | Where | Ideal image | Crop |
|---|---|---|---|
| `hero` | Hero arch | A-rank tournament / court photo, Leslie centred | 4:5 portrait |
| `about-portrait` | About, large arch | Portrait or candid court-side | 4:5 |
| `about-inset` | About, small inset | Detail / candid | 4:3 |
| `xp-1` (`data-i="0"`) | Experience · ~60 / week | Leslie coaching a group | any; stage is tall |
| `xp-2` (`data-i="1"`) | Experience · 2 years | Leslie coaching one-to-one / on court | — |
| `xp-3` (`data-i="2"`) | Experience · 24 courts | Club opening / indoor courts | — |
| `xp-4` (`data-i="3"`) | Experience · Tournament | Medal / podium photo | — |
| `gallery-feature` | On the court, big frame | Best match photo, or a real match video | 16:9 |
| `gallery-compete/coach/community/court` | Collage | One per category | 3:4, 1:1, 3:2, 4:5 |
| `coaching` (3) | Coaching experience panel | Coaching · club · neutral court | 4:3 |

Each Experience image appears twice in `index.html` (desktop stage `.xp__shot` + mobile `.xp__m`) —
swap both.

## 3. Swapping a photo

1. Export WebP/AVIF ~1600px long edge into this folder, e.g. `leslie-hero.webp`.
2. Update the `<img src>`, `width`/`height`, and write a real `alt` (who/what/where — no invented event names).
3. Adjust `style="--pos: X% Y%"` so Leslie's face sits well in the crop.
4. Remove `is-placeholder` from the `<figure>` and delete its `.ph-note` tag.
5. Update the hero `<link rel="preload">` in `<head>` to the new hero file.

## 4. Captions — what we may and may not say

- OK without confirmation: "Tournament competition", "Competitive pickleball", "Leslie McCoy".
- Needs Leslie's confirmation first: tournament names, divisions, ratings, medal colours ("Gold"),
  dates, club names, partner names.

## 5. Video

Only real footage of Leslie (no stock). Put the file in `assets/video/`, then on the
`.action__play` button add `data-video="assets/video/clip.mp4"` (optional `data-poster`).
The hover label switches to **WATCH** and the lightbox plays it.
