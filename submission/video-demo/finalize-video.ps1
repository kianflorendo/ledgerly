param([string]$FfmpegPath = (Join-Path $env:TEMP 'ledgerly-video-render-tools/node_modules/ffmpeg-static/ffmpeg.exe'))
$ErrorActionPreference='Stop'
if (!(Test-Path -LiteralPath $FfmpegPath)) { throw 'Supply -FfmpegPath with your local FFmpeg executable.' }
$submission=Split-Path $PSScriptRoot
$inputVideo=Join-Path $submission 'motion-silent.mp4'
$voice=Join-Path $PSScriptRoot 'assets/narration.wav'
$outputVideo=Join-Path $submission 'ledgerly-agent-benchmark-video.mp4'
& $FfmpegPath -hide_banner -loglevel error -y -i $inputVideo -i $voice -map 0:v:0 -map 1:a:0 -af 'atempo=1.0114,apad' -t 114 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart $outputVideo
if($LASTEXITCODE -ne 0){throw 'Video finalization failed'}
Write-Output "Created $outputVideo"
