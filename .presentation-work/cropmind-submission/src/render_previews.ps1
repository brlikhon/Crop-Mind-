param(
  [string]$OutDir = "C:\Users\brlik\Downloads\Proof-Plan\CropMind\.presentation-work\cropmind-submission\scratch\previews"
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$W = 1920
$H = 1080
$C = @{
  Paper = [System.Drawing.ColorTranslator]::FromHtml("#F5F7EF")
  Ink = [System.Drawing.ColorTranslator]::FromHtml("#123026")
  Dark = [System.Drawing.ColorTranslator]::FromHtml("#071D18")
  Green = [System.Drawing.ColorTranslator]::FromHtml("#0F7A55")
  Lime = [System.Drawing.ColorTranslator]::FromHtml("#B7E36A")
  Clay = [System.Drawing.ColorTranslator]::FromHtml("#D56F3E")
  Teal = [System.Drawing.ColorTranslator]::FromHtml("#0E8A8A")
  Gold = [System.Drawing.ColorTranslator]::FromHtml("#D9A441")
  Muted = [System.Drawing.ColorTranslator]::FromHtml("#557064")
  Line = [System.Drawing.ColorTranslator]::FromHtml("#DDE6DB")
  White = [System.Drawing.Color]::White
}

function FontOf([single]$size, [switch]$Bold) {
  $style = if ($Bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  return [System.Drawing.Font]::new("Aptos", $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

function BrushOf($color) {
  return [System.Drawing.SolidBrush]::new($color)
}

function DrawText($g, [string]$text, [single]$x, [single]$y, [single]$w, [single]$h, [single]$size, $color, [bool]$bold = $false) {
  $font = FontOf $size -Bold:($bold)
  $brush = BrushOf $color
  $format = [System.Drawing.StringFormat]::new()
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
  $g.DrawString($text, $font, $brush, [System.Drawing.RectangleF]::new($x, $y, $w, $h), $format)
  $font.Dispose()
  $brush.Dispose()
  $format.Dispose()
}

function FillRect($g, $color, [single]$x, [single]$y, [single]$w, [single]$h) {
  $brush = BrushOf $color
  $g.FillRectangle($brush, [System.Drawing.RectangleF]::new($x, $y, $w, $h))
  $brush.Dispose()
}

function StrokeRect($g, $color, [single]$x, [single]$y, [single]$w, [single]$h, [single]$weight = 2) {
  $pen = [System.Drawing.Pen]::new($color, $weight)
  $g.DrawRectangle($pen, $x, $y, $w, $h)
  $pen.Dispose()
}

function DrawMetric($g, [string]$label, [string]$value, [string]$note, [single]$x, [single]$y, [single]$w, [single]$h, $accent) {
  FillRect $g $C.White $x $y $w $h
  StrokeRect $g $C.Line $x $y $w $h 2
  FillRect $g $accent $x $y 12 $h
  DrawText $g $value ($x + 36) ($y + 22) ($w - 58) 74 54 $accent $true
  DrawText $g $label ($x + 36) ($y + 95) ($w - 58) 40 24 $C.Ink $true
  DrawText $g $note ($x + 36) ($y + 137) ($w - 58) 74 20 $C.Muted $false
}

function DrawHeader($g, $slide) {
  FillRect $g $slide.Accent 92 86 74 8
  DrawText $g $slide.Overline 182 70 620 40 24 $slide.Accent $true
  DrawText $g $slide.Title 92 142 1260 190 66 $C.Ink $true
  DrawText $g $slide.Subtitle 92 342 1220 88 29 $C.Muted $false
}

function DrawSlide($index, $slide) {
  $bmp = [System.Drawing.Bitmap]::new($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  FillRect $g $C.Paper 0 0 $W $H

  if ($index -eq 1) {
    DrawText $g "Google Cloud Gen AI Academy APAC 2026" 92 110 760 40 24 $C.Green $true
    DrawText $g "CropMind" 92 210 820 140 116 $C.Ink $true
    DrawText $g "From one farmer's symptom report to safer field action, regional intelligence, and measurable APAC impact." 92 382 760 146 34 $C.Muted $false
    FillRect $g $C.Dark 1030 0 890 1080
    DrawText $g "621,826" 1100 130 680 150 126 $C.Lime $true
    DrawText $g "hectares in active alert zones in the embedded APAC dataset" 1104 286 640 86 30 ([System.Drawing.ColorTranslator]::FromHtml("#D6E8DE")) $false
    DrawMetric $g "active alerts" "34" "including 13 critical threats" 1104 520 300 220 $C.Lime
    DrawMetric $g "market rows" "115" "prices used for business signals" 1432 520 300 220 $C.Lime
    DrawMetric $g "crop types" "15" "across disease and market context" 1104 770 300 220 $C.Lime
    DrawMetric $g "support programs" "13" "active subsidy paths surfaced" 1432 770 300 220 $C.Lime
  } else {
    DrawHeader $g $slide
    $y = 500
    $x = 92
    $boxW = 520
    $gap = 36
    $i = 0
    foreach ($item in $slide.Points) {
      $accent = $slide.Colors[$i % $slide.Colors.Count]
      DrawMetric $g $item.Label $item.Value $item.Note ($x + (($i % 3) * ($boxW + $gap))) ($y + ([Math]::Floor($i / 3) * 245)) $boxW 205 $accent
      $i++
    }
    if ($slide.Callout) {
      FillRect $g $C.Dark 1210 620 560 260
      DrawText $g $slide.Callout 1260 666 460 150 38 $C.Lime $true
    }
  }

  DrawText $g ("{0:00}" -f $index) 1780 1018 70 30 22 $C.Muted $true
  $path = Join-Path $OutDir ("slide-{0:00}.png" -f $index)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  return $path
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$slides = @(
  @{ Overline="00 / Submission"; Title="CropMind"; Subtitle="From one farmer's symptom report to safer field action, regional intelligence, and measurable APAC impact."; Accent=$C.Green; Points=@(); Colors=@($C.Green); Callout="" },
  @{ Overline="01 / Problem"; Title="Agricultural advice breaks at the exact moment speed matters."; Subtitle="Smallholders need safe treatment guidance, while officers need regional signal from scattered reports."; Accent=$C.Clay; Points=@(
    @{Label="gap"; Value="Delay"; Note="Symptoms arrive in language, images, and partial context."},
    @{Label="risk"; Value="Safety"; Note="Treatment must include PPE, timing, label, and escalation."},
    @{Label="scale"; Value="No map"; Note="Institutions need a field queue, not isolated answers."}
  ); Colors=@($C.Clay,$C.Gold,$C.Teal); Callout="Judge lens: urgency, safety, scale." },
  @{ Overline="02 / Solution"; Title="One workflow connects farmer advice to field response."; Subtitle="Specialized Gen AI agents, grounded tools, and outcome learning serve both smallholders and institutions."; Accent=$C.Green; Points=@(
    @{Label="step 1"; Value="Input"; Note="Voice, photo, and natural-language symptoms."},
    @{Label="step 2"; Value="Agents"; Note="Disease, weather, market, and treatment specialists."},
    @{Label="step 3"; Value="Action"; Note="Immediate steps, safety, timeline, and follow-up."},
    @{Label="step 4"; Value="Officer"; Note="Risk scoring, subsidy matching, and field queue."}
  ); Colors=@($C.Green,$C.Teal,$C.Gold,$C.Clay); Callout="A product loop, not only a chatbot." },
  @{ Overline="03 / Farmer"; Title="The farmer screen is built for real constraints."; Subtitle="Diagnosis becomes a safe action plan that works in low-bandwidth, multilingual field settings."; Accent=$C.Teal; Points=@(
    @{Label="access"; Value="Voice"; Note="Farmer can speak instead of type."},
    @{Label="language"; Value="Multi"; Note="Response can be translated for local use."},
    @{Label="upload"; Value="Low data"; Note="Image evidence without heavy network cost."},
    @{Label="learning"; Value="Follow-up"; Note="Resolved cases improve future recommendations."}
  ); Colors=@($C.Teal,$C.Green,$C.Gold,$C.Clay); Callout="Farmer value: clearer next action today." },
  @{ Overline="04 / Officer"; Title="The officer dashboard turns cases into regional action."; Subtitle="Sprint 3 creates the B2G/B2B layer: intervention queue, risk map, market signal, and subsidy support."; Accent=$C.Gold; Points=@(
    @{Label="risk score"; Value="0-100"; Note="Severity, area, and crop spread."},
    @{Label="field queue"; Value="Top 6"; Note="Ranked export for field teams."},
    @{Label="support"; Value="Subsidy"; Note="Programs linked to crops and country."},
    @{Label="market"; Value="Signal"; Note="Prices help prioritize intervention."}
  ); Colors=@($C.Green,$C.Clay,$C.Gold,$C.Teal); Callout="Institution value: prioritize scarce field capacity." },
  @{ Overline="05 / Impact"; Title="Sprint 4 proves the business case."; Subtitle="The impact console models farmer reach, value at risk, preventable loss, buyer segments, and trust controls."; Accent=$C.Green; Points=@(
    @{Label="affected area"; Value="621,826 ha"; Note="Embedded active alert zones."},
    @{Label="countries"; Value="8"; Note="Alerts, markets, and subsidies."},
    @{Label="programs"; Value="13"; Note="Support pathways surfaced."},
    @{Label="pilot model"; Value="ROI"; Note="Exportable impact brief."}
  ); Colors=@($C.Green,$C.Teal,$C.Gold,$C.Clay); Callout="Business value: agencies, co-ops, insurers, NGOs." },
  @{ Overline="06 / Technical"; Title="The architecture is made for Google Cloud Gen AI."; Subtitle="A modular agent system grounds recommendations in data, sources, and outcome feedback."; Accent=$C.Teal; Points=@(
    @{Label="Google Cloud"; Value="Vertex AI"; Note="Gemini reasoning and synthesis."},
    @{Label="agent layer"; Value="ADK"; Note="Disease, weather, market, treatment."},
    @{Label="tools"; Value="MCP"; Note="Weather, alerts, market, subsidy data."},
    @{Label="grounding"; Value="Sources"; Note="Traceable evidence and safety caveats."},
    @{Label="memory"; Value="Cases"; Note="Follow-up outcomes feed the system."}
  ); Colors=@($C.Green,$C.Teal,$C.Gold,$C.Clay,$C.Green); Callout="Technical clarity for the judge." },
  @{ Overline="07 / Safety"; Title="Trust is designed into the workflow."; Subtitle="CropMind does not stop at fluent text. It makes safety, evidence, and human escalation visible."; Accent=$C.Clay; Points=@(
    @{Label="evidence"; Value="Sources"; Note="Disease and treatment links are shown."},
    @{Label="chemical safety"; Value="PPE"; Note="Timing, label, and escalation warnings."},
    @{Label="learning"; Value="Follow-up"; Note="Outcome tracker closes the loop."},
    @{Label="oversight"; Value="Human"; Note="High-risk issues enter officer queue."}
  ); Colors=@($C.Green,$C.Clay,$C.Gold,$C.Teal); Callout="Trust and safety as product features." },
  @{ Overline="08 / Build Proof"; Title="Five sprints moved CropMind from prototype to submission story."; Subtitle="Each sprint adds a judge-visible reason to believe: usefulness, access, scale, viability, and demo clarity."; Accent=$C.Gold; Points=@(
    @{Label="S1"; Value="Farmer"; Note="Action plan, safety, sources, follow-up."},
    @{Label="S2"; Value="Access"; Note="Multilingual, voice, low-data upload."},
    @{Label="S3"; Value="Officer"; Note="Risk map, field queue, market, subsidy."},
    @{Label="S4"; Value="Impact"; Note="ROI, buyer use cases, proof plan."},
    @{Label="S5"; Value="Demo"; Note="Run of show and export brief."}
  ); Colors=@($C.Green,$C.Teal,$C.Gold,$C.Clay,$C.Green); Callout="The project now tells a complete story." },
  @{ Overline="09 / Demo"; Title="Lead judges through the product, not a feature list."; Subtitle="The /demo route gives a five-minute run of show with copyable prompts and exact proof order."; Accent=$C.Green; Points=@(
    @{Label="1"; Value="Impact"; Note="Start with business value."},
    @{Label="2"; Value="Farmer"; Note="Show diagnosis and safe action."},
    @{Label="3"; Value="Follow-up"; Note="Show learning loop."},
    @{Label="4"; Value="Officer"; Note="Show field queue and response."},
    @{Label="5"; Value="Architecture"; Note="Explain Google Cloud fit."}
  ); Colors=@($C.Green,$C.Teal,$C.Gold,$C.Clay,$C.Green); Callout="A judge can understand it in five minutes." },
  @{ Overline="10 / Pilot"; Title="CropMind is ready for a district pilot."; Subtitle="Launch with extension officers, co-ops, or insurers to validate treatment speed, outcome capture, and subsidy linkage."; Accent=$C.Green; Points=@(
    @{Label="pilot geography"; Value="3 regions"; Note="Start where active alerts are highest."},
    @{Label="pilot cases"; Value="300"; Note="Farmer sessions in first week."},
    @{Label="success target"; Value="<48h"; Note="Symptom report to treatment action."}
  ); Colors=@($C.Green,$C.Teal,$C.Clay); Callout="Clear next step after the competition." }
)

$paths = @()
for ($i = 0; $i -lt $slides.Count; $i++) {
  $paths += DrawSlide ($i + 1) $slides[$i]
}

$thumbW = 480
$thumbH = 270
$cols = 4
$rows = [Math]::Ceiling($paths.Count / $cols)
$montage = [System.Drawing.Bitmap]::new($thumbW * $cols, $thumbH * $rows)
$mg = [System.Drawing.Graphics]::FromImage($montage)
$mg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
FillRect $mg $C.Paper 0 0 ($thumbW * $cols) ($thumbH * $rows)
for ($i = 0; $i -lt $paths.Count; $i++) {
  $img = [System.Drawing.Image]::FromFile($paths[$i])
  $x = ($i % $cols) * $thumbW
  $y = [Math]::Floor($i / $cols) * $thumbH
  $mg.DrawImage($img, $x, $y, $thumbW, $thumbH)
  $img.Dispose()
}
$montagePath = Join-Path $OutDir "montage.png"
$montage.Save($montagePath, [System.Drawing.Imaging.ImageFormat]::Png)
$mg.Dispose()
$montage.Dispose()

[pscustomobject]@{
  PreviewDir = $OutDir
  SlideCount = $paths.Count
  Montage = $montagePath
  Slides = $paths
} | ConvertTo-Json -Depth 3
