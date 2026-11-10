param(
  [string]$InputPath = (Join-Path $PSScriptRoot 'narration.txt'),
  [string]$OutputPath = (Join-Path $PSScriptRoot 'assets\narration.wav')
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.SelectVoice('Microsoft Zira Desktop')
  $synth.Rate = 2
  $synth.Volume = 100
  $paragraphs = [regex]::Split((Get-Content -LiteralPath $InputPath -Raw).Trim(), '(?:\r?\n){2,}')
  $body = foreach ($paragraph in $paragraphs) {
    $escaped = [System.Security.SecurityElement]::Escape($paragraph.Trim())
    "<p><prosody pitch='+7%' rate='+3%'><s>$escaped</s></prosody><break time='300ms'/></p>"
  }
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>$($body -join '')</speak>"
  $synth.SetOutputToWaveFile($OutputPath)
  $synth.SpeakSsml($ssml)
  $synth.SetOutputToNull()
  Write-Output "Created local Zira narration at $OutputPath"
}
finally {
  $synth.Dispose()
}
