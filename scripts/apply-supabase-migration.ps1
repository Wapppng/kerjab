param(
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF
)

if (-not $AccessToken) {
  Write-Error "Supabase access token belum tersedia. Setel SUPABASE_ACCESS_TOKEN atau kirim -AccessToken."
  exit 1
}

if (-not $ProjectRef) {
  $ProjectRef = "vqqntgrbagvjmzwubdoi"
}

Write-Host "Login ke Supabase CLI..."
npx supabase login --token $AccessToken --name kerjab

Write-Host "Menghubungkan project Supabase..."
npx supabase link --project-ref $ProjectRef

Write-Host "Menerapkan migrasi ke Supabase..."
npx supabase db push
