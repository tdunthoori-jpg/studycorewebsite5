$files = @(
    "src\components\auth\AuthForms.tsx",
    "src\components\dashboard\Dashboards.tsx",
    "src\components\auth\ProfileSetup.tsx",
    "src\pages\profile\ProfilePage.tsx",
    "src\pages\classes\ClassDetail.tsx",
    "src\pages\classes\ClassesPage.tsx",
    "src\pages\schedule\SchedulePage.tsx",
    "src\pages\assignments\AssignmentsPage.tsx",
    "src\pages\assignments\AssignmentDetail.tsx",
    "src\pages\messages\MessagesPage.tsx",
    "src\pages\ProfileDebug.tsx",
    "src\pages\auth\VerifyEmailPage.tsx",
    "src\pages\auth\AuthStatusPage.tsx"
)

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $updatedContent = $content -replace "from '@/contexts/AuthContext'", "from '@/contexts/SimpleAuthContext'"
        Set-Content -Path $filePath -Value $updatedContent -NoNewline
        Write-Output "Updated $file"
    } else {
        Write-Output "File not found: $file"
    }
}

Write-Output "Update complete!"