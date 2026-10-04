$json = @{
    name = "Test Candidate"
    email = "test.candidate@skillora.ai"
    password = "Password123!"
    role = "LEARNER"
    country = "Bangladesh"
    educationLevel = "B.Sc. in Computer Science"
    careerInterest = "Full-Stack Software Engineer"
} | ConvertTo-Json

$reg = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Body $json -ContentType "application/json"
Write-Host "Register result: verified =" $reg.user.isVerified ", token =" $reg.verificationToken

$verifyPayload = @{ token = $reg.verificationToken } | ConvertTo-Json
$ver = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/verify-email" -Method Post -Body $verifyPayload -ContentType "application/json"
Write-Host "Verify result: verified =" $ver.user.isVerified ", message =" $ver.message

# Also test admin rejection
try {
    $adminPayload = @{
        name = "Hacker"
        email = "hacker@skillora.ai"
        password = "Password123!"
        role = "ADMIN"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Body $adminPayload -ContentType "application/json"
    Write-Host "ERROR: Admin registration should have failed!"
} catch {
    Write-Host "SUCCESS: Admin registration blocked as expected:" $_.Exception.Message
}
