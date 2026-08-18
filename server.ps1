param([int]$Port = 8000)

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

$endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Loopback, $Port)
$listener = New-Object System.Net.Sockets.TcpListener $endpoint

try {
    $listener.Start()
    Write-Host "====================================================" -ForegroundColor Green
    Write-Host "  Local Web Server Running at http://localhost:$Port/" -ForegroundColor Cyan
    Write-Host "  (Keep this window open. Close window to stop)" -ForegroundColor Yellow
    Write-Host "====================================================" -ForegroundColor Green
} catch {
    Write-Host "Error starting server on port $Port : $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".woff2"= "font/woff2"
    ".woff" = "font/woff"
    ".ttf"  = "font/ttf"
    ".buf"  = "application/octet-stream"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".ktx2" = "image/ktx2"
    ".wasm" = "application/wasm"
    ".ogg"  = "audio/ogg"
    ".webm" = "video/webm"
    ".mp4"  = "video/mp4"
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)

        $requestLine = $reader.ReadLine()
        if (-not $requestLine) {
            $client.Close()
            continue
        }

        $parts = $requestLine.Split(' ')
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }

        $rawPath = $parts[1].Split('?')[0].TrimStart('/')
        $rawPath = [System.Uri]::UnescapeDataString($rawPath)
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "index.html"
        }

        $localPath = [System.IO.Path]::Combine($rootDir, $rawPath)

        if (Test-Path -LiteralPath $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $ct = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)

            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $nf = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
            $nfBytes = [System.Text.Encoding]::ASCII.GetBytes($nf)
            $stream.Write($nfBytes, 0, $nfBytes.Length)
        }
        $stream.Flush()
        $client.Close()
    } catch {
        # ignore client disconnects
    }
}