# Tiny static file server for the Richard Rich site (no Node/Python needed).
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Then open http://localhost:5173
param([int]$Port = 5173)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Richard Rich running at http://localhost:$Port  (Ctrl+C to stop)"

$mime = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".js"="text/javascript; charset=utf-8"; ".json"="application/json";
  ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".png"="image/png";
  ".svg"="image/svg+xml"; ".ico"="image/x-icon"; ".webp"="image/webp"
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)

    # --- photo upload endpoint (used by add-photos.html) ---
    if ($ctx.Request.HttpMethod -eq "POST" -and $path -eq "/upload") {
      $name = $ctx.Request.QueryString["name"]
      $allowed = @("founder-tayyab.jpg", "founder-abaidullah.jpg")
      if ($allowed -contains $name) {
        $ms = New-Object System.IO.MemoryStream
        $ctx.Request.InputStream.CopyTo($ms)
        $target = Join-Path $root ("assets\" + $name)
        [System.IO.File]::WriteAllBytes($target, $ms.ToArray())
        $ok = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
        $ctx.Response.ContentType = "application/json"
        $ctx.Response.OutputStream.Write($ok, 0, $ok.Length)
      } else {
        $ctx.Response.StatusCode = 400
        $err = [System.Text.Encoding]::UTF8.GetBytes('{"ok":false}')
        $ctx.Response.OutputStream.Write($err, 0, $err.Length)
      }
      $ctx.Response.OutputStream.Close()
      continue
    }

    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root ($path.TrimStart("/"))
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch {}
}
