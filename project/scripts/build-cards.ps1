# Builds the laser test files for bus1idea (plantable prayer card set) from designs\cards.json.
# Output in designs\laser-test\:
#   <name>.svg          text/pictures = black filled, border = blue filled ring, cut = red hairline (LightBurn
#                       runs layers in colour order: black, blue, red = text, border, cut)
#   <name>-engrave.png  engraving only, black on white at pngPixelsPerMm dots per mm (for image-based programs)
# Laser software ignores drawn line thickness, so every line is turned into a filled shape (Inkscape).
# Lettering is read as outlines from the font file in the licensed library; nothing is installed.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\build-cards.ps1
# Keep this file ASCII only: Windows PowerShell 5.1 misreads other characters in scripts.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$utf8 = New-Object System.Text.UTF8Encoding($false)
$project = Split-Path -Parent $PSScriptRoot
$config = Get-Content (Join-Path $project 'designs\cards.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tools = Get-Content (Join-Path $project $config.inkscapeFrom) -Raw -Encoding UTF8 | ConvertFrom-Json
$inkscape = ($tools.system | Where-Object { $_.name -eq 'Inkscape' }).exe
if (-not $inkscape -or -not (Test-Path $inkscape)) { throw 'Inkscape not found; check the system entry in Workshop\Bezalel\tools\tools.json' }
$renderer = Join-Path $project $config.renderer
$outDir = Join-Path $project $config.outputDir
$work = Join-Path $outDir '_work'
New-Item -ItemType Directory -Force -Path $work | Out-Null
$IN = 25.4
$lw = $config.lineWidth
function N([double]$v) { return $v.ToString('0.###', $inv) }
function N4([double]$v) { $s = $v.ToString('0.####', $inv); if ($s -eq '-0') { $s = '0' }; return $s }

# --- lettering ---
$gt = New-Object System.Windows.Media.GlyphTypeface([uri](Join-Path $config.fontRoot $config.font))
$hIndex = 0; [void]$gt.CharacterToGlyphMap.TryGetValue([int][char]'H', [ref]$hIndex)
$capPerEm = $gt.GetGlyphOutline($hIndex, 1, 1).Bounds.Height
$missing = @{}
$mainFace = [pscustomobject]@{ Gt = $gt; CapPerEm = $capPerEm }
function Get-Face([string]$relPath) {
    $g = New-Object System.Windows.Media.GlyphTypeface([uri](Join-Path $config.fontRoot $relPath))
    $h = 0; [void]$g.CharacterToGlyphMap.TryGetValue([int][char]'H', [ref]$h)
    return [pscustomobject]@{ Gt = $g; CapPerEm = $g.GetGlyphOutline($h, 1, 1).Bounds.Height }
}
function Use-Face($face) { $script:gt = $face.Gt; $script:capPerEm = $face.CapPerEm }

function Get-Width([string]$text, [double]$cap) {
    $size = $cap / $capPerEm; $w = 0.0
    foreach ($ch in $text.ToCharArray()) {
        $gi = 0
        if ($gt.CharacterToGlyphMap.TryGetValue([int]$ch, [ref]$gi)) { $w += $gt.AdvanceWidths[$gi] * $size }
        else { $w += 0.3 * $size; if ($ch -ne ' ') { $missing[[string]$ch] = 1 } }
    }
    return $w
}

function Get-Line([string]$text, [double]$cap, [double]$x, [double]$y, [string]$anchor = 'middle') {
    # one line as filled outlines; y is the baseline, cap the height of a capital in mm
    $size = $cap / $capPerEm
    $w = Get-Width $text $cap
    $left = $x; if ($anchor -eq 'middle') { $left = $x - $w / 2 } elseif ($anchor -eq 'end') { $left = $x - $w }
    $sb = New-Object System.Text.StringBuilder; $pos = 0.0
    foreach ($ch in $text.ToCharArray()) {
        $gi = 0
        if (-not $gt.CharacterToGlyphMap.TryGetValue([int]$ch, [ref]$gi)) { $pos += 0.3 * $size; continue }
        $d = [System.Windows.Media.PathGeometry]::CreateFromGeometry($gt.GetGlyphOutline($gi, $size, $size)).ToString($inv) -replace '^F[01]\s*', ''
        if ($d) { [void]$sb.Append("<path fill=""#000000"" stroke=""none"" transform=""translate($(N ($left + $pos)) $(N $y))"" d=""$d""/>") }
        $pos += $gt.AdvanceWidths[$gi] * $size
    }
    return $sb.ToString()
}

function Split-Lines([string]$text, [double]$cap, [double]$maxW) {
    $lines = New-Object System.Collections.Generic.List[string]; $cur = ''
    foreach ($word in ($text -split '\s+')) {
        if (-not $word) { continue }
        $try = if ($cur) { "$cur $word" } else { $word }
        if ($cur -and (Get-Width $try $cap) -gt $maxW) { $lines.Add($cur); $cur = $word } else { $cur = $try }
    }
    if ($cur) { $lines.Add($cur) }
    return ,$lines
}

function Get-Block([string]$text, [double]$maxCap, [double]$minCap, [double]$lead, [double]$cx, [double]$top, [double]$maxW, [double]$maxH) {
    # the largest letter size whose wrapped lines fit the box; centred in the box
    $cap = $maxCap
    while ($true) {
        $lines = Split-Lines $text $cap $maxW
        $h = $cap + ($lines.Count - 1) * $cap * $lead
        if ($h -le $maxH -or $cap -le $minCap) { break }
        $cap = [Math]::Round($cap - 0.05, 3)
    }
    if ($h -gt $maxH) { Write-Warning "Text does not fit at the smallest allowed size ($minCap mm): $($text.Substring(0, 30))..." }
    $y = $top + ($maxH - $h) / 2 + $cap
    $sb = New-Object System.Text.StringBuilder
    foreach ($l in $lines) { [void]$sb.Append((Get-Line $l $cap $cx $y 'middle')); $y += $cap * $lead }
    return [pscustomobject]@{ Svg = $sb.ToString(); Cap = $cap; Lines = $lines.Count }
}

function Stroke([string]$inner, [double]$width = $lw) {
    return "<g fill=""none"" stroke=""#000000"" stroke-width=""$(N $width)"" stroke-linecap=""round"" stroke-linejoin=""round"">$inner</g>"
}
function Dot([double]$x, [double]$y, [double]$r) { return "<circle cx=""$(N $x)"" cy=""$(N $y)"" r=""$(N $r)"" fill=""#000000"" stroke=""none""/>" }
function Cross([double]$cx, [double]$top, [double]$size) {
    return Stroke "<path d=""M $(N $cx) $(N $top) V $(N ($top + $size)) M $(N ($cx - $size * 0.32)) $(N ($top + $size * 0.32)) H $(N ($cx + $size * 0.32))""/>" 0.5
}

# --- files ---
function Merge-Shapes([string]$tag, [double]$wMm, [double]$hMm, [string]$inner, [string]$fill) {
    # lines to shapes and merged into one by Inkscape; returns the merged drawing (the inside of the <svg>)
    $svg = "<svg xmlns=""http://www.w3.org/2000/svg"" width=""$(N $wMm)mm"" height=""$(N $hMm)mm"" viewBox=""0 0 $(N $wMm) $(N $hMm)"">$inner</svg>"
    $drawn = Join-Path $work "$tag-drawn.svg"
    $merged = Join-Path $work "$tag-merged.svg"
    [System.IO.File]::WriteAllText($drawn, $svg, $utf8)
    if (Test-Path $merged) { Remove-Item -LiteralPath $merged }
    $ErrorActionPreference = 'Continue'
    & $inkscape $drawn "--actions=select-all:no-groups;object-stroke-to-path;select-all:no-groups;path-union;export-plain-svg;export-filename:$merged;export-do" 2>&1 | Out-Null
    $ErrorActionPreference = 'Stop'
    if (-not (Test-Path $merged)) { throw "Inkscape did not write $merged" }
    $out = Get-Content $merged -Raw -Encoding UTF8
    $out = [regex]::Replace($out, '(?s)(<path\b(?:(?!\sd=")[^>])*?)\s+style="[^"]*"', '$1')
    $out = $out -replace '<path\b', "<path fill=""$fill"" stroke=""none"""
    # plain decimals only: Inkscape writes tiny values as 8.95e-05, which some laser software passes on to GRBL
    # (GRBL error:2, bad number format). Round every number to 4 places (0.0001 mm) and never use exponents.
    $out = [regex]::Replace($out, '-?\d*\.?\d+[eE][-+]?\d+', { param($m) N4 ([double]::Parse($m.Value, $inv)) })
    $out = [regex]::Replace($out, '-?\d+\.\d{5,}', { param($m) N4 ([double]::Parse($m.Value, $inv)) })
    $m = [regex]::Match($out, '(?s)<svg\b[^>]*>(.*)</svg>')
    if (-not $m.Success) { throw "Unexpected Inkscape output in $merged" }
    return [pscustomobject]@{ Head = $out.Substring(0, $m.Groups[1].Index); Body = $m.Groups[1].Value }
}
function Build-File([string]$name, [double]$wMm, [double]$hMm, [string]$engrave, [object[]]$cuts) {
    # Layers, in the order the laser runs them (LightBurn sorts by colour: black C00, blue C01, red C02):
    #   1. text and pictures: black filled shapes   2. border: blue filled ring   3. cut: red hairline
    $hasBorder = $engrave -match 'data-b="1"'
    $textOnly = $engrave -replace '<rect data-b="1"[^>]*/>', ''
    $text = Merge-Shapes $name $wMm $hMm $textOnly '#000000'
    $borderBody = ''
    if ($hasBorder) {
        $borderOnly = [regex]::Replace($engrave, '<(path|circle|ellipse|rect|line|polyline|polygon)\b(?![^>]*data-b="1")[^>]*/>', '')
        $borderBody = (Merge-Shapes "$name-border" $wMm $hMm $borderOnly $config.border.color).Body
    }
    # engraving-only file for the PNG: text and border both black
    $eng = Join-Path $work "$name-engrave.svg"
    $out = $text.Head + $text.Body + ($borderBody -replace [regex]::Escape("fill=""$($config.border.color)"""), 'fill="#000000"') + '</svg>'
    [System.IO.File]::WriteAllText($eng, $out, $utf8)
    $out = $text.Head + $text.Body + $borderBody + '</svg>'
    $png = Join-Path $outDir "$name-engrave.png"
    & $renderer --width ([int][Math]::Round($wMm * $config.pngPixelsPerMm)) --background white $eng $png
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $cuts) {
        # rounded rectangle: the cut follows the outside edge of the engraved border, same corner radius
        $r = [Math]::Min($config.border.cornerRadius, [Math]::Min($c.W, $c.H) / 2)
        $d = "M $(N ($c.X + $r)) $(N $c.Y) h $(N ($c.W - 2 * $r)) a $(N $r) $(N $r) 0 0 1 $(N $r) $(N $r) v $(N ($c.H - 2 * $r)) a $(N $r) $(N $r) 0 0 1 $(N (-$r)) $(N $r) h $(N (-($c.W - 2 * $r))) a $(N $r) $(N $r) 0 0 1 $(N (-$r)) $(N (-$r)) v $(N (-($c.H - 2 * $r))) a $(N $r) $(N $r) 0 0 1 $(N $r) $(N (-$r)) Z"
        [void]$sb.Append("<path fill=""none"" stroke=""$($config.cutStroke.color)"" stroke-width=""$(N $config.cutStroke.width)"" d=""$d""/>")
    }
    $final = $out -replace '</svg>\s*$', ($sb.ToString() + '</svg>')
    $svgPath = Join-Path $outDir "$name.svg"
    [System.IO.File]::WriteAllText($svgPath, $final, $utf8)
    & $renderer --width ([int][Math]::Round($wMm * $config.pngPixelsPerMm)) --background white $svgPath (Join-Path $work "$name-preview.png")
    "{0}: {1} x {2} mm, {3} cut(s) -> {4}" -f $name, (N $wMm), (N $hMm), $cuts.Count, $svgPath
}
function Cut([double]$x, [double]$y, [double]$w, [double]$h) { return [pscustomobject]@{ X = $x; Y = $y; W = $w; H = $h } }
function Border([double]$w, [double]$h) {
    # solid engraved border along the card edge: a line of the border width drawn half its width inside the edge,
    # so its outside edge is the card edge with the configured corner radius (where the cut runs)
    $t = $config.border.width; $rx = [Math]::Max(0, $config.border.cornerRadius - $t / 2)
    return Stroke "<rect data-b=""1"" x=""$(N ($t / 2))"" y=""$(N ($t / 2))"" width=""$(N ($w - $t))"" height=""$(N ($h - $t))"" rx=""$(N $rx)"" ry=""$(N $rx)""/>" $t
}

# --- prayer card (portrait, local mm) ---
$pc = $config.prayerCard
$pcW = $pc.widthIn * $IN; $pcH = $pc.heightIn * $IN
$prayer = $config.prayers | Where-Object { $_.id -eq $pc.prayer }
if (-not $prayer) { throw "Prayer '$($pc.prayer)' not found in cards.json" }
function Get-PrayerCard {
    $m = $pc.margin
    $s = Get-Line $prayer.title $pc.titleCap ($pcW / 2) ($m + $pc.titleCap) 'middle'
    $crossTop = $m + $pc.titleCap + $pc.gap
    $s += Cross ($pcW / 2) $crossTop $pc.crossSize
    $refY = $pcH - $m - 1
    $s += Get-Line $prayer.reference $pc.refCap ($pcW / 2) $refY 'middle'
    $top = $crossTop + $pc.crossSize + $pc.gap
    $bottom = $refY - $pc.refCap - $pc.gap
    $b = Get-Block $prayer.text $pc.bodyMaxCap $pc.bodyMinCap $pc.lead ($pcW / 2) $top ($pcW - 2 * $m) ($bottom - $top)
    Write-Host ("Prayer card body: capital height {0} mm, {1} lines" -f (N $b.Cap), $b.Lines)
    return $s + $b.Svg + (Border $pcW $pcH)
}
$prayerSvg = Get-PrayerCard
Build-File 'prayer-card' $pcW $pcH $prayerSvg @(Cut 0 0 $pcW $pcH)

# three per run: cards turned so the 6 in side runs along the 200 mm axis, stacked across the 150 mm axis
$tw = $config.travel.width; $th = $config.travel.height
$stack = 3 * $pcW + 2 * $pc.layoutGap
if ($stack -gt $th) { throw "Three prayer cards ($(N $stack) mm) do not fit the $th mm side" }
$x0 = ($tw - $pcH) / 2; $y0 = ($th - $stack) / 2
$layout = ''; $cuts = @()
for ($i = 0; $i -lt 3; $i++) {
    $y = $y0 + $i * ($pcW + $pc.layoutGap)
    $layout += "<g transform=""translate($(N $x0) $(N ($y + $pcW))) rotate(-90)"">$prayerSvg</g>"
    $cuts += Cut $x0 $y $pcH $pcW
}
Build-File 'prayer-card-3up' $tw $th $layout $cuts

# --- thank-you card ---
$ty = $config.thankYou
$captionFace = if ($ty.captionFont) { Get-Face $ty.captionFont } else { $mainFace }
$tyW = $ty.widthIn * $IN; $tyH = $ty.heightIn * $IN
function Get-ThankYouFront {
    $m = $ty.margin
    $s = Get-Line $ty.heading $ty.headingCap ($tyW / 2) ($m + $ty.headingCap) 'middle'
    $ruleY = $m + $ty.headingCap + 4
    $s += Stroke "<path d=""M $(N ($tyW / 2 - 16)) $(N ($ruleY + 2)) H $(N ($tyW / 2 - 4)) M $(N ($tyW / 2 + 4)) $(N ($ruleY + 2)) H $(N ($tyW / 2 + 16))""/>" 0.4
    $s += Cross ($tyW / 2) $ruleY 4
    $top = $ruleY + 8
    $b = Get-Block $ty.text $ty.bodyMaxCap $ty.bodyMinCap $ty.lead ($tyW / 2) $top ($tyW - 2 * $m) ($tyH - $m - $top)
    Write-Host ("Thank-you message: capital height {0} mm, {1} lines" -f (N $b.Cap), $b.Lines)
    return $s + $b.Svg + (Border $tyW $tyH)
}

# the four steps, each drawn around (0,0) in a box about 36 x 56 mm before scaling
function Pot { return "<rect x=""-12"" y=""4"" width=""24"" height=""4"" rx=""0.8""/><path d=""M -10.5 8 L -8 24 L 8 24 L 10.5 8""/>" }
function Soil { return "<path d=""M -11 4 Q 0 -1.5 11 4""/>" }
function Step1 {
    # fill a pot with potting soil
    $s = Stroke ((Pot) + (Soil) + "<g transform=""translate(-9 -17) rotate(35)""><rect x=""-5"" y=""-8"" width=""10"" height=""15"" rx=""1""/><path d=""M -5 -4 H 5""/></g>")
    return $s + (Dot -2 -6 0.7) + (Dot 0 -3 0.7) + (Dot -3 -2 0.6) + (Dot 1 0 0.6)
}
function Step2 {
    # lay the seed card on the soil and cover it lightly
    $s = Stroke ((Pot) + (Soil) + "<rect x=""-7.5"" y=""-19"" width=""15"" height=""5"" rx=""0.5""/><path d=""M 0 -11 V -3 M -2.5 -5.5 L 0 -3 L 2.5 -5.5""/>")
    return $s
}
function Step3 {
    # water and pray, every day
    $s = Stroke ((Pot) + (Soil) +
        '<path d="M 0 2 V -4 M 0 -2 Q -3 -5 -5 -3 Q -3 -1 0 -2 M 0 -3.5 Q 3 -7 5 -5 Q 3 -3 0 -3.5"/>' +
        '<rect x="-15" y="-25" width="9" height="7" rx="1"/><path d="M -6 -22 L -2 -18 M -15 -23.5 Q -18.5 -21.5 -15 -19.5"/>' +
        '<path d="M 11 -28 C 9 -25 8 -19 8 -14 V -9 M 11 -28 C 13 -25 14 -19 14 -14 V -9 M 11 -26.5 V -9 M 11 -17 Q 9.3 -15 9.8 -11.5 M 11 -17 Q 12.7 -15 12.2 -11.5"/>' +
        '<rect x="7" y="-9" width="3.6" height="3"/><rect x="11.4" y="-9" width="3.6" height="3"/>' +
        '<g transform="translate(-15.5 14) scale(0.85) translate(16 -14)"><circle cx="-16" cy="14" r="2"/><path d="M -16 10 V 9 M -16 18 V 19 M -20 14 H -21 M -12 14 H -11 M -18.8 11.2 L -19.5 10.5 M -13.2 11.2 L -12.5 10.5 M -18.8 16.8 L -19.5 17.5 M -13.2 16.8 L -12.5 17.5"/></g>' +
        '<path d="M 17 11.5 A 3 3 0 1 0 17 16.5 A 2.3 2.3 0 1 1 17 11.5 Z"/>')
    return $s + (Dot -1.2 -14 0.6) + (Dot -0.6 -11 0.6) + (Dot 0 -8 0.6)
}
function Step4 {
    # it blooms
    $petals = ''
    for ($k = 0; $k -lt 6; $k++) { $petals += "<ellipse cx=""0"" cy=""-4.3"" rx=""2"" ry=""3.2"" transform=""translate(0 -18) rotate($(60 * $k))""/>" }
    $s = Stroke ((Pot) + (Soil) + '<path d="M 0 2 V -14 M 0 -5 Q -5 -9 -8 -6 Q -5 -3 0 -5 M 0 -8 Q 5 -12 8 -9 Q 5 -6 0 -8"/>' + $petals)
    return $s + (Dot 0 -18 2)
}
function Get-ThankYouBack {
    $m = 4
    $s = Stroke "<path d=""M $(N ($tyW / 2)) $(N $m) V $(N ($tyH - $m)) M $(N $m) $(N ($tyH / 2)) H $(N ($tyW - $m))""/>" 0.4
    $qw = $tyW / 2; $qh = $tyH / 2
    $steps = @((Step1), (Step2), (Step3), (Step4))
    for ($i = 0; $i -lt 4; $i++) {
        $qx = ($i % 2) * $qw; $qy = [Math]::Floor($i / 2) * $qh
        $s += Get-Line ([string]($i + 1)) $ty.numberCap ($qx + $m + 2) ($qy + $m + 2 + $ty.numberCap) 'start'
        $s += "<g transform=""translate($(N ($qx + $qw / 2)) $(N ($qy + $qh / 2 + 1))) scale($(N $ty.pictureScale))"">$($steps[$i])</g>"
        if ($ty.captions -and $ty.captions[$i]) {
            # short caption under each picture, in the caption font
            Use-Face $captionFace
            $s += Get-Line $ty.captions[$i] $ty.captionCap ($qx + $qw / 2) ($qy + $qh - $ty.captionBottom) 'middle'
            Use-Face $mainFace
        }
    }
    if ($config.border.onThankYouBack) { $s += Border $tyW $tyH }
    return $s
}
$tyFront = Get-ThankYouFront
$tyBack = Get-ThankYouBack
Build-File 'thank-you-front' $tyW $tyH $tyFront @(Cut 0 0 $tyW $tyH)
Build-File 'thank-you-back' $tyW $tyH $tyBack @()

# two per run, portrait, side by side along the 200 mm axis; the back uses the same places (flip left to right)
$pair = 2 * $tyW + $ty.layoutGap
$x0 = ($tw - $pair) / 2; $y0 = ($th - $tyH) / 2
$front = ''; $back = ''; $cuts = @()
for ($i = 0; $i -lt 2; $i++) {
    $x = $x0 + $i * ($tyW + $ty.layoutGap)
    $front += "<g transform=""translate($(N $x) $(N $y0))"">$tyFront</g>"
    $back += "<g transform=""translate($(N $x) $(N $y0))"">$tyBack</g>"
    $cuts += Cut $x $y0 $tyW $tyH
}
Build-File 'thank-you-2up-front' $tw $th $front $cuts
Build-File 'thank-you-2up-back' $tw $th $back @()

# --- seed swatch: the verse reference on 1 x 3 in seed paper ---
$sw = $config.seedSwatch
$swW = $sw.widthIn * $IN; $swH = $sw.heightIn * $IN
$capFit = [Math]::Min($sw.textCap, $sw.textCap * ($swW - 2 * $sw.margin) / (Get-Width $prayer.reference $sw.textCap))
$swatch = Get-Line $prayer.reference $capFit ($swW / 2) ($swH / 2 + $capFit / 2) 'middle'
if ($config.border.onSeedSwatch) { $swatch += Border $swW $swH }
Build-File 'seed-swatch' $swW $swH $swatch @(Cut 0 0 $swW $swH)
$gridW = $sw.columns * $swW + ($sw.columns - 1) * $sw.layoutGap
$gridH = $sw.rows * $swH + ($sw.rows - 1) * $sw.layoutGap
$x0 = ($tw - $gridW) / 2; $y0 = ($th - $gridH) / 2
$grid = ''; $cuts = @()
for ($r = 0; $r -lt $sw.rows; $r++) { for ($c = 0; $c -lt $sw.columns; $c++) {
    $x = $x0 + $c * ($swW + $sw.layoutGap); $y = $y0 + $r * ($swH + $sw.layoutGap)
    $grid += "<g transform=""translate($(N $x) $(N $y))"">$swatch</g>"
    $cuts += Cut $x $y $swW $swH
} }
Build-File 'seed-swatch-6up' $tw $th $grid $cuts

# --- size ladder: how small Fipty Serif can be engraved and still read ---
$sl = $config.sizeLadder
$m = $pc.margin
$y = $m
$ladder = Get-Line 'Fipty Serif' 2.2 ($pcW / 2) ($y + 2.2) 'middle'
$y += 2.2 + 4
foreach ($cap in $sl.caps) {
    $lines = Split-Lines $sl.sample $cap ($pcW - 2 * $m - $sl.labelWidth)
    $y += $cap
    $ladder += Get-Line ((N $cap)) $sl.labelCap $m $y 'start'
    foreach ($l in $lines) { $ladder += Get-Line $l $cap ($m + $sl.labelWidth) $y 'start'; $y += $cap * 1.6 }
    $y += 3
}
if ($y -gt $pcH - $m) { Write-Warning "Size ladder runs past the card ($(N $y) mm of $(N $pcH))" }
$ladder += Border $pcW $pcH
Build-File 'size-ladder' $pcW $pcH $ladder @(Cut 0 0 $pcW $pcH)

if ($missing.Count) { Write-Warning ("Characters not in the font (left as spaces): " + (($missing.Keys | Sort-Object) -join ' ')) }
