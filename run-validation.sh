#!/bin/bash
# CropMind - Validation Test Script

API_URL="${1:-http://localhost:8080}"

echo "Running validation tests against: $API_URL"
echo ""

# Test cases
declare -a queries=(
  "My rice plants in Punjab have brown spots on leaves and yellowing. Planted 6 weeks ago."
  "Tomato plants in Maharashtra showing wilting despite watering. Stems have dark streaks."
  "Wheat crop in Uttar Pradesh has orange pustules on leaves. Should I treat or replant?"
  "Cotton plants in Gujarat have white flies and sticky leaves. What should I do?"
  "Maize in Karnataka has leaf blight. Planted 4 weeks ago during monsoon."
)

results_file="validation_results.json"
echo "[" > $results_file

total=0
success=0

for query in "${queries[@]}"; do
  total=$((total + 1))
  echo "Test $total: ${query:0:50}..."
  
  start_time=$(date +%s%3N)
  response=$(curl -s -X POST $API_URL/api/cropagent/diagnose \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$query\"}")
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  
  if echo "$response" | jq -e '.finalRecommendation' > /dev/null 2>&1; then
    success=$((success + 1))
    echo "  ✅ Success (${duration}ms)"
    
    # Extract key metrics
    confidence=$(echo "$response" | jq -r '.confidenceScore // 0')
    agents=$(echo "$response" | jq -r '.traces | length')
    
    echo "  Confidence: $confidence, Agents: $agents"
  else
    echo "  ❌ Failed"
  fi
  
  # Save result
  echo "$response" | jq ". + {\"test_id\": $total, \"duration_ms\": $duration, \"query\": \"$query\"}" >> $results_file
  if [ $total -lt ${#queries[@]} ]; then
    echo "," >> $results_file
  fi
  
  echo ""
done

echo "]" >> $results_file

# Summary
accuracy=$((success * 100 / total))
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              VALIDATION RESULTS                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests: $total"
echo "Successful: $success"
echo "Failed: $((total - success))"
echo "Accuracy: $accuracy%"
echo ""
echo "Results saved to: $results_file"
