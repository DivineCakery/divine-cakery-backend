#!/bin/bash
# Manual EAS project setup

export EXPO_TOKEN="Y3Rw_AjfTy5AHdEDC2jq6SQXMe22UfOVi8gKhHs1"

echo "Creating EAS project via API..."
curl -X POST "https://api.expo.dev/v2/projects" \
  -H "Authorization: Bearer $EXPO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "divinecakery",
    "projectName": "divine-cakery"
  }' 2>&1
