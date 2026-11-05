# Laser test files: Lord's Prayer set

Built by `scripts/build-cards.ps1` from `designs/cards.json` (text, sizes, font). Change the JSON and run the
script again; don't edit these files by hand.

```
powershell -ExecutionPolicy Bypass -File scripts\build-cards.ps1
```

Every file comes in two forms:
- `<name>.svg`: three colour layers, for LightBurn or any program that sorts layers by colour:
  **black filled = text and pictures** (C00), **blue filled ring = border** (C01), **red hairline = cut** (C02).
  The thank-you backs have no cut.
- `<name>-engrave.png`: the engraving only, black on white at 10 dots per mm (so 200 mm = 2000 px). For programs
  that engrave from images (LaserGRBL). It has no cut lines.

All letters are outlines from Fipty Serif (licensed library on W:); no font needs installing on the laser PC.

**Border and cut (Ken, 2026-11-03):** every card has a **0.6 mm solid engraved border** along its outside edge with
**1 mm rounded corners**. The **cut runs last, on the outside edge of that border**, with the same 1 mm corners.
Settings are in `border` in `designs/cards.json`. The thank-you back and the seed swatch also get the border
(`onThankYouBack`, `onSeedSwatch`; set either to `false` to drop it). The cut line is centred on the edge, so the cut
itself (the kerf) takes about half its width off the border; on the card the border will read a little under 0.6 mm.

## Run order (Ken, 2026-11-03): text outline > text fill > border > outer cut

The border is its own blue layer, so it can run after the text and before the cut. In LightBurn:

| Layer | Colour | Mode | What it does |
|---|---|---|---|
| C00 | black | **Line** sub-layer first, then **Fill** sub-layer | text outline, then text fill |
| C01 | blue | Fill | border |
| C02 | red | Line | outer cut, always last |

- To add the sub-layer, right-click C00 and choose **Add sub-layer**. Set the first part to Line and the second to Fill.
  Instead of the two parts, **Offset Fill** on its own also works: it traces each letter's outline first, then
  works inward.
- **Edit > Optimization Settings:** tick **Order by layer**; untick **Order by group** and **Order by priority**.
  Check the layers list reads C00, C01, C02 from top to bottom (use the arrows to reorder).
- Run the outline at the same power as the fill or a little lower, so the letter edges don't scorch.

The PNG files hold text and border together in black (an image has no layers); they have no cut.

## Files

| File | Size | What it is |
|---|---|---|
| `prayer-card` | 1 7/8 x 6 in (47.6 x 152.4 mm) | One prayer card: title, cross, the Lord's Prayer (capital height 3.5 mm, 21 lines), Matthew 6:9–13 |
| `prayer-card-3up` | 200 x 150 mm | Three prayer cards per run, turned so the 6 in side runs along the 200 mm axis; 2.5 mm gaps |
| `thank-you-front` | 3 1/4 x 5 in (82.6 x 127 mm) | Thank-you heading, cross rule, draft message (capital height 4.5 mm) |
| `thank-you-back` | 3 1/4 x 5 in | The 4 picture steps in quarters, each with a short caption in Gores Sans ("add soil", "plant seed swatch", "water & pray daily", "keep going"); the dividing lines form a cross. No cut (it was cut with the front) |
| `thank-you-2up-front` / `-back` | 200 x 150 mm | Two thank-you cards per run; the back uses exactly the same places |
| `seed-swatch` | 1 x 3 in (25.4 x 76.2 mm) | "Matthew 6:9–13" on seed paper |
| `seed-swatch-6up` | 200 x 150 mm | Six swatches per run |
| `size-ladder` | prayer-card size | Fipty Serif at capital heights 1.4 to 4.0 mm, to find the smallest size that engraves clearly |

## Suggested test order (on the 65 lb cardstock)

1. **Size ladder first.** Engrave and cut it. Note the smallest line you can read easily, and whether the thin
   strokes and the capital G stay clear. The prayer card uses 3.5 mm.
2. **One prayer card** (`prayer-card`). Check that the engraving is crisp, the cut is clean and goes all the way
   through, and look for scorching on the face. Note the time.
3. **Prayer card 3-up.** Check all three cards fit inside the travel and the cuts don't run into each other
   (the stack is 147.9 mm of the 150 mm side; the 200 x 150 mm figure needs confirming on the machine).
4. **Thank-you 2-up, front then back.** Engrave and cut the front. Leave the sheet where it is, flip each card
   **left to right** (like turning a book page, so the top stays at the top) and drop it back into its own hole.
   Run `thank-you-2up-back` without moving anything. Check the back sits square on the card: the back's border
   runs right along the cut edge, so any shift shows at once as a border that is thicker on one side or runs off the card.
5. **Seed swatch** on seed paper: engrave at low power, and watch the paper the whole time. Plant a few engraved
   swatches next to unengraved ones to confirm the engraving doesn't hurt the seeds.

Note settings (power, speed, passes) and times for each step here or in the blueprint.

## If GRBL stops with error:2

`error:2` = "Numeric value format is not valid": the controller got a G-code line with a number it can't read.
The files now hold plain decimals only (no `e-05` exponent numbers; changed 2026-11-03 after the first error).
If it happens again: in LightBurn use **File > Save GCode**, and send that file with the line number from the console.

## Things to look at

- **Border:** solid and even all the way round, corners round (not flat), and the cut lands on its outside edge
  with no white sliver between border and edge. Try the border on the seed paper at low power: thin seed paper
  may burn through along a solid line.

- **Capital G in Fipty Serif:** its tall right-hand stroke sits close to the next letter, so "God" and "Give" can
  read as "Giod"/"Gave" at small sizes. That's how the font is drawn. Check it on the ladder; if it bothers you,
  we can widen the space after G or choose another font.
- **Verse dash:** "6:9–13" uses Fipty Serif's dash, which is long. A plain hyphen is an option.
- Thank-you wording is the draft with the accepted light edits; final words come later.
