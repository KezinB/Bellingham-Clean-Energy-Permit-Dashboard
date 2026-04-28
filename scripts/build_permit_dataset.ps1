param(
    [string]$JsonOutputPath = "data/permit_data.json",
    [string]$JsOutputPath = "js/permit-data.js",
    [switch]$SkipGeocoding
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Web

$baseUrl = "https://permiteyes.us/bellingham"
$publicViewUrl = "$baseUrl/publicview.php"
$recordsUrl = "$baseUrl/ajax/getbuildingpublichome.php"
$headers = @{
    Referer = $publicViewUrl
    "X-Requested-With" = "XMLHttpRequest"
}

$searchTerms = @(
    "solar",
    "photovoltaic",
    "battery storage",
    "wall connector",
    "car charger",
    "vehicle charger",
    "charging station",
    "evse",
    "heat pump",
    "mini split",
    "mini-split",
    "ductless",
    "hyper heat",
    "air source heat pump",
    "tesla"
)

function New-DataTableBody {
    param(
        [string]$SearchTerm,
        [int]$Start,
        [int]$Length
    )

    $body = @{
        "draw" = "1"
        "start" = "$Start"
        "length" = "$Length"
        "search[value]" = $SearchTerm
        "search[regex]" = "false"
        "order[0][column]" = "3"
        "order[0][dir]" = "desc"
    }

    for ($index = 0; $index -lt 13; $index++) {
        $orderable = if ($index -ge 3) { "true" } else { "false" }
        $body["columns[$index`][data]"] = "$index"
        $body["columns[$index`][name]"] = ""
        $body["columns[$index`][searchable]"] = "true"
        $body["columns[$index`][orderable]"] = $orderable
        $body["columns[$index`][search][value]"] = ""
        $body["columns[$index`][search][regex]"] = "false"
    }

    $body
}

function Invoke-PermitSearch {
    param(
        [string]$SearchTerm,
        [int]$Start = 0,
        [int]$Length = 250
    )

    $body = New-DataTableBody -SearchTerm $SearchTerm -Start $Start -Length $Length
    Invoke-RestMethod -Method Post -Uri $recordsUrl -Headers $headers -Body $body
}

function Strip-Html {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $decoded = [System.Web.HttpUtility]::HtmlDecode($Value)
    $plain = [regex]::Replace($decoded, "<[^>]+>", " ")
    ([regex]::Replace($plain, "\s+", " ")).Trim()
}

function Get-HtmlAttribute {
    param(
        [string]$Html,
        [string]$Name
    )

    if ([string]::IsNullOrWhiteSpace($Html)) {
        return ""
    }

    $doubleQuoted = [regex]::Match($Html, "$Name=""([^""]*)""")
    if ($doubleQuoted.Success) {
        return $doubleQuoted.Groups[1].Value
    }

    $singleQuoted = [regex]::Match($Html, "$Name='([^']*)'")
    if ($singleQuoted.Success) {
        return $singleQuoted.Groups[1].Value
    }

    ""
}

function Convert-DateValue {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $formats = @("MM/dd/yy", "M/d/yy", "MM/dd/yyyy", "M/d/yyyy")
    foreach ($format in $formats) {
        try {
            return [datetime]::ParseExact($Value, $format, [System.Globalization.CultureInfo]::InvariantCulture)
        } catch {
        }
    }

    $null
}

function To-TitleCase {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $textInfo = [System.Globalization.CultureInfo]::InvariantCulture.TextInfo
    $normalized = ($Value.ToLowerInvariant() -replace "\s+", " ").Trim()
    $title = $textInfo.ToTitleCase($normalized)
    $title = $title -replace "\bSt\b", "St"
    $title = $title -replace "\bRd\b", "Rd"
    $title = $title -replace "\bLn\b", "Ln"
    $title = $title -replace "\bDr\b", "Dr"
    $title = $title -replace "\bAve\b", "Ave"
    $title = $title -replace "\bBlvd\b", "Blvd"
    $title = $title -replace "\bCt\b", "Ct"
    $title = $title -replace "\bMa\b", "MA"
    $title
}

function Parse-PermitRow {
    param(
        [object[]]$Row,
        [string]$SearchTerm
    )

    $applicationMarkup = [string]$Row[0]
    $applicationId = Get-HtmlAttribute -Html $applicationMarkup -Name "data-application-id"
    $permitId = Get-HtmlAttribute -Html $applicationMarkup -Name "data-permit-id"
    $recordId = Strip-Html -Value ([string]$Row[3])
    $appliedDate = Convert-DateValue -Value (Strip-Html -Value ([string]$Row[4]))
    $issuedDate = Convert-DateValue -Value (Strip-Html -Value ([string]$Row[5]))
    $address = To-TitleCase (Strip-Html -Value ([string]$Row[6]))
    $applicant = To-TitleCase (Strip-Html -Value ([string]$Row[7]))
    $description = Strip-Html -Value ([string]$Row[8])
    $applicationType = Strip-Html -Value ([string]$Row[9])
    $permitNumber = Strip-Html -Value ([string]$Row[10])
    $status = Strip-Html -Value ([string]$Row[11])

    [pscustomobject]@{
        recordId = $recordId
        applicationId = $applicationId
        permitId = $permitId
        appliedDate = $appliedDate
        issuedDate = $issuedDate
        address = $address
        applicant = $applicant
        description = $description
        applicationType = $applicationType
        permitNumber = $permitNumber
        status = $status
        sourceKeyword = $SearchTerm
    }
}

function Classify-Permit {
    param([pscustomobject]$Permit)

    $text = @(
        $Permit.applicationType,
        $Permit.description,
        $Permit.applicant,
        $Permit.permitNumber
    ) -join " "
    $haystack = $text.ToLowerInvariant()
    $matchedTerms = New-Object System.Collections.Generic.List[string]

    $category = $null

    $evPatterns = @(
        "ev charger",
        "electric vehicle",
        "car charger",
        "vehicle charger",
        "charging station",
        "evse",
        "wall connector",
        "chargepoint",
        "tesla charger",
        "tesla wall"
    )
    $heatPumpPatterns = @(
        "heat pump",
        "mini split",
        "mini-split",
        "ductless",
        "hyper heat",
        "air source heat pump",
        "cold climate heat pump"
    )
    $solarPatterns = @(
        "solar",
        "photovoltaic",
        "battery storage",
        "sunrun",
        "sunpower",
        "sunova",
        "tesla energy",
        "tesla solar"
    )

    foreach ($pattern in $evPatterns) {
        if ($haystack.Contains($pattern)) {
            $matchedTerms.Add($pattern)
        }
    }
    if ($matchedTerms.Count -gt 0) {
        $category = "EV Charger"
    }

    if (-not $category) {
        foreach ($pattern in $heatPumpPatterns) {
            if ($haystack.Contains($pattern)) {
                $matchedTerms.Add($pattern)
            }
        }
        if ($matchedTerms.Count -gt 0) {
            $category = "Heat Pump"
        }
    }

    if (-not $category) {
        foreach ($pattern in $solarPatterns) {
            if ($haystack.Contains($pattern)) {
                $matchedTerms.Add($pattern)
            }
        }
        if ($haystack -match "(^|[^a-z])pv([^a-z]|$)") {
            $matchedTerms.Add("pv")
        }
        if ($matchedTerms.Count -gt 0) {
            $category = "Solar"
        }
    }

    if (-not $category) {
        return $null
    }

    [pscustomobject]@{
        category = $category
        matchedTerms = ($matchedTerms | Select-Object -Unique)
    }
}

function Get-GeocodeLookup {
    param([string[]]$Addresses)

    $lookup = @{}
    if ($SkipGeocoding -or $Addresses.Count -eq 0) {
        return ,$lookup
    }

    $chunkSize = 900
    $addressIndex = 0

    while ($addressIndex -lt $Addresses.Count) {
        $sliceEnd = [Math]::Min($addressIndex + $chunkSize - 1, $Addresses.Count - 1)
        $chunk = $Addresses[$addressIndex..$sliceEnd]
        $csvLines = New-Object System.Collections.Generic.List[string]
        $chunkId = 1

        foreach ($address in $chunk) {
            $escapedAddress = $address.Replace('"', '""')
            $csvLines.Add("$chunkId,""$escapedAddress"",Bellingham,MA,02019")
            $chunkId++
        }

        $tempFile = Join-Path -Path $PWD -ChildPath "geocode_batch_$addressIndex.csv"
        Set-Content -LiteralPath $tempFile -Value $csvLines -Encoding Ascii

        try {
            $response = curl.exe -s -F "addressFile=@$tempFile" -F "benchmark=4" -F "vintage=4" "https://geocoding.geo.census.gov/geocoder/locations/addressbatch"
        } finally {
            Remove-Item -LiteralPath $tempFile -ErrorAction SilentlyContinue
        }

        $lineIndex = 0
        foreach ($line in ($response -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) {
                continue
            }

            $lineIndex++
            $parts = $line | ConvertFrom-Csv -Header id,input,match,resultType,matchedAddress,coordinates,tigerId,side
            $rowId = [int](($parts.id -replace "^\uFEFF", "").Trim())
            $originalAddress = $chunk[$rowId - 1]
            if ($parts.match -eq "Match" -and $parts.coordinates) {
                $coordinateParts = $parts.coordinates -split ","
                if ($coordinateParts.Count -eq 2) {
                    $lookup[$originalAddress] = [pscustomobject]@{
                        lng = [double]$coordinateParts[0]
                        lat = [double]$coordinateParts[1]
                        matchedAddress = $parts.matchedAddress
                    }
                }
            }
        }

        $addressIndex += $chunkSize
    }

    return ,$lookup
}

$recordsById = @{}

foreach ($term in $searchTerms) {
    $start = 0
    do {
        $response = Invoke-PermitSearch -SearchTerm $term -Start $start -Length 250
        $total = [int]$response.recordsFiltered

        foreach ($row in $response.data) {
            $permit = Parse-PermitRow -Row $row -SearchTerm $term
            if ([string]::IsNullOrWhiteSpace($permit.recordId)) {
                continue
            }

            $classification = Classify-Permit -Permit $permit
            if (-not $classification) {
                continue
            }

            if ($recordsById.ContainsKey($permit.recordId)) {
                $existing = $recordsById[$permit.recordId]
                $existing.sourceKeywords = ($existing.sourceKeywords + $term | Select-Object -Unique)
                $existing.matchedTerms = ($existing.matchedTerms + $classification.matchedTerms | Select-Object -Unique)
                continue
            }

            $effectiveDate = if ($permit.issuedDate) { $permit.issuedDate } else { $permit.appliedDate }
            $recordsById[$permit.recordId] = [pscustomobject]@{
                id = $permit.recordId
                applicationId = $permit.applicationId
                permitId = $permit.permitId
                category = $classification.category
                date = if ($effectiveDate) { $effectiveDate.ToString("yyyy-MM-dd") } else { "" }
                appliedDate = if ($permit.appliedDate) { $permit.appliedDate.ToString("yyyy-MM-dd") } else { "" }
                issuedDate = if ($permit.issuedDate) { $permit.issuedDate.ToString("yyyy-MM-dd") } else { "" }
                address = $permit.address
                city = "Bellingham"
                state = "MA"
                applicant = $permit.applicant
                description = $permit.description
                applicationType = $permit.applicationType
                permitNumber = $permit.permitNumber
                status = $permit.status
                matchedTerms = $classification.matchedTerms
                sourceKeywords = @($term)
                sourceUrl = $publicViewUrl
                lat = $null
                lng = $null
                matchedAddress = ""
            }
        }

        $start += 250
    } while ($start -lt $total)
}

$records = @(
    $recordsById.Values |
        Sort-Object @{ Expression = { if ($_.date) { [datetime]$_.date } else { [datetime]::MinValue } }; Descending = $true }, id
)

$uniqueAddresses = @(
    $records |
        Select-Object -ExpandProperty address |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique
)
$geocodeLookup = Get-GeocodeLookup -Addresses $uniqueAddresses

$records = @(
    foreach ($record in $records) {
        $copy = [ordered]@{}
        foreach ($property in $record.PSObject.Properties) {
            $copy[$property.Name] = $property.Value
        }

        if ($geocodeLookup.ContainsKey($record.address)) {
            $copy.lat = $geocodeLookup[$record.address].lat
            $copy.lng = $geocodeLookup[$record.address].lng
            $copy.matchedAddress = $geocodeLookup[$record.address].matchedAddress
        }

        [pscustomobject]$copy
    }
)

$meta = [ordered]@{
    title = "Bellingham Clean Energy Permits"
    source = $publicViewUrl
    generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    methodology = "Keyword-based classification over Bellingham building permits from PermitEyes. Categories are estimated from permit descriptions and application metadata."
    totalRecords = @($records).Count
    geocodedRecords = @($records | Where-Object { $null -ne $_.lat -and $null -ne $_.lng }).Count
    categoryCounts = [ordered]@{
        Solar = @($records | Where-Object { $_.category -eq "Solar" }).Count
        "EV Charger" = @($records | Where-Object { $_.category -eq "EV Charger" }).Count
        "Heat Pump" = @($records | Where-Object { $_.category -eq "Heat Pump" }).Count
    }
    searchTerms = $searchTerms
}

$dataset = [ordered]@{
    meta = $meta
    records = $records
}

$jsonDirectory = Split-Path -Parent $JsonOutputPath
$jsDirectory = Split-Path -Parent $JsOutputPath
if ($jsonDirectory) {
    New-Item -ItemType Directory -Force -Path $jsonDirectory | Out-Null
}
if ($jsDirectory) {
    New-Item -ItemType Directory -Force -Path $jsDirectory | Out-Null
}

$json = $dataset | ConvertTo-Json -Depth 6
Set-Content -LiteralPath $JsonOutputPath -Value $json -Encoding UTF8
Set-Content -LiteralPath $JsOutputPath -Value ("window.PERMIT_DATA = " + $json + ";" + [Environment]::NewLine) -Encoding UTF8

Write-Host "Wrote $($records.Count) records to $JsonOutputPath and $JsOutputPath"
