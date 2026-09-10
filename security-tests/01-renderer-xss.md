# SensibleMD Renderer Security Test

This file contains intentionally hostile Markdown/HTML for testing SensibleMD.

## Test 1 — Script Tag

<script>
alert("SMD_SCRIPT_EXECUTED")
</script>

## Test 2 — Inline Event Handler

<img src="this-file-does-not-exist.png" onerror="alert('SMD_ONERROR_EXECUTED')">

## Test 3 — JavaScript URL

[JavaScript URL Test](javascript:alert('SMD_JAVASCRIPT_URL_EXECUTED'))

## Test 4 — Normal HTTPS Link

[Normal HTTPS Link](https://example.com)

## End

If SensibleMD is secure, none of the JavaScript tests above should execute.
