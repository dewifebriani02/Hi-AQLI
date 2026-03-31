$replacements = @{
    "@/components/quiz-client" = "@/components/mufradat/quiz-client"
    "@/components/tikrar-schedule" = "@/components/tikrar/tikrar-schedule"
    "@/components/tikrar-system" = "@/components/tikrar/tikrar-system"
    "@/components/mushaf-page" = "@/components/tilawah/mushaf-page"
    "@/components/tilawah-client" = "@/components/tilawah/tilawah-client"
    "@/components/juz-list" = "@/components/tilawah/juz-list"
    "@/components/surah-list" = "@/components/tilawah/surah-list"
    "@/components/logo" = "@/components/common/logo"
    "@/components/bottom-nav" = "@/components/common/bottom-nav"
    "@/components/app-sidebar" = "@/components/common/app-sidebar"
    "@/components/hifz-progress-chart" = "@/components/progress/hifz-progress-chart"
    "@/components/progress-client" = "@/components/progress/progress-client"
    "@/components/ai-scholar-client" = "@/components/ai/ai-scholar-client"
    "@/components/page-exam-simulation" = "@/components/exam/page-exam-simulation"
}

Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $originalContent = $content
    foreach ($entry in $replacements.GetEnumerator()) {
        $key = $entry.Key
        $value = $entry.Value
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $value)
        }
    }
    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($_.FullName, $content)
        Write-Host "Updated imports in: $($_.FullName)"
    }
}
