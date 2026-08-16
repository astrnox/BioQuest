$root = 'd:\bioquest\openmaic-main\lib'
Get-ChildItem $root -Directory | ForEach-Object {
    $files = Get-ChildItem $_.FullName -Recurse -File -Include *.ts,*.tsx -ErrorAction SilentlyContinue
    $size = ($files | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{
        Name    = $_.Name
        SizeKB  = [math]::Round($size / 1KB, 1)
        Files   = $files.Count
    }
} | Sort-Object SizeKB -Descending | Format-Table -AutoSize
