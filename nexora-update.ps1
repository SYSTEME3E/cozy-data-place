# ============================================
# NEXORA - Script de mise a jour automatique
# Double-cliquez ou lancez dans PowerShell
# ============================================

$PROJECT = "C:\Users\p\StudioProjects\cozy-data-place"
$JAVA_HOME_PATH = "C:\Program Files\Android\Android Studio4\jbr"
$APK_SOURCE = "$PROJECT\android\app\build\outputs\apk\debug\app-debug.apk"

# ============================================
# COLLEZ VOTRE TOKEN GITHUB ICI (ne pas partager)
$GITHUB_TOKEN = "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







"
$GITHUB_REPO = "SYSTEME3E/cozy-data-place"
# ============================================

# Demander la version
$version = Read-Host "Entrez le numero de version (ex: 3.0)"
$message = Read-Host "Description de la mise a jour (ex: Nouvelles fonctionnalites)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NEXORA UPDATE v$version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ETAPE 1 - GitHub
Write-Host "[1/5] Envoi du code sur GitHub..." -ForegroundColor Yellow
Set-Location $PROJECT
git add -A
git commit -m "v$version - $message"
git push origin main
Write-Host "OK - Code envoye sur GitHub" -ForegroundColor Green
Write-Host ""

# ETAPE 2 - Build web
Write-Host "[2/5] Build du projet web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR lors du build web !" -ForegroundColor Red; exit 1 }
Write-Host "OK - Build web termine" -ForegroundColor Green
Write-Host ""

# ETAPE 3 - Sync Capacitor
Write-Host "[3/5] Synchronisation Capacitor Android..." -ForegroundColor Yellow
$env:JAVA_HOME = $JAVA_HOME_PATH
npx cap sync android
Write-Host "OK - Capacitor synchronise" -ForegroundColor Green
Write-Host ""

# ETAPE 4 - Build APK
Write-Host "[4/5] Generation de l'APK..." -ForegroundColor Yellow
Set-Location "$PROJECT\android"
.\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR lors du build APK !" -ForegroundColor Red; exit 1 }
Write-Host "OK - APK genere avec succes !" -ForegroundColor Green
Write-Host ""

# ETAPE 5 - Publier sur GitHub Releases automatiquement
Write-Host "[5/5] Publication sur GitHub Releases..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "token $GITHUB_TOKEN"
    "Content-Type"  = "application/json"
    "Accept"        = "application/vnd.github.v3+json"
}

$releaseBody = @{
    tag_name   = "v$version"
    name       = "Nexora v$version - $message"
    body       = "## Nexora v$version`n`n$message`n`nTelecharger l'APK ci-dessous pour installer sur Android."
    draft      = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$GITHUB_REPO/releases" -Method Post -Headers $headers -Body $releaseBody
    Write-Host "OK - Release v$version creee !" -ForegroundColor Green

    # Upload APK
    $uploadUrl = $release.upload_url -replace "\{\?name,label\}", ""
    $apkName = "nexora-v$version.apk"
    $uploadHeaders = @{
        "Authorization" = "token $GITHUB_TOKEN"
        "Content-Type"  = "application/vnd.android.package-archive"
    }
    Invoke-RestMethod -Uri "${uploadUrl}?name=$apkName" -Method Post -Headers $uploadHeaders -InFile $APK_SOURCE | Out-Null
    Write-Host "OK - APK uploade sur GitHub Releases !" -ForegroundColor Green
    $apkUrl = "https://github.com/$GITHUB_REPO/releases/download/v$version/$apkName"

} catch {
    Write-Host "ERREUR publication Releases: $_" -ForegroundColor Red
    $apkUrl = "https://github.com/$GITHUB_REPO/releases/new"
    Write-Host "Publiez manuellement sur : $apkUrl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MISE A JOUR TERMINEE !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "APK disponible sur GitHub Releases :" -ForegroundColor White
Write-Host $apkUrl -ForegroundColor Yellow
Write-Host ""

Start-Process "https://github.com/$GITHUB_REPO/releases"
Read-Host "Appuyez sur Entree pour fermer"

