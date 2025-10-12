#!/bin/bash

###############################################################################
# PRODUCTION MONITORING DASHBOARD
# Real-time monitoring of Learn-X generation pipeline
###############################################################################

LOG_FILE="app/backend/backend.log"
REFRESH_INTERVAL=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function print_header() {
    clear
    echo "================================================================================"
    echo -e "${CYAN}🔍 LEARN-X PRODUCTION MONITORING DASHBOARD${NC}"
    echo "================================================================================"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Log: $LOG_FILE"
    echo "Refresh: ${REFRESH_INTERVAL}s"
    echo "================================================================================"
    echo ""
}

function get_metric() {
    local pattern=$1
    local recent_lines=${2:-100}
    tail -n $recent_lines "$LOG_FILE" 2>/dev/null | grep -c "$pattern" || echo "0"
}

function get_last() {
    local pattern=$1
    local count=${2:-5}
    tail -n 200 "$LOG_FILE" 2>/dev/null | grep "$pattern" | tail -n $count
}

function calculate_percentage() {
    local numerator=$1
    local denominator=$2
    if [ "$denominator" -eq 0 ]; then
        echo "0"
    else
        echo "scale=1; ($numerator * 100) / $denominator" | bc
    fi
}

function monitor_loop() {
    while true; do
        print_header
        
        # ========== GENERATION METRICS (Last 100 lines) ==========
        echo -e "${GREEN}📊 GENERATION METRICS${NC} (Last 100 log entries)"
        echo "────────────────────────────────────────────────────────────────────────────"
        
        local attempts=$(get_metric "Attempt" 100)
        local successes=$(get_metric "SUCCESS" 100)
        local failures=$(get_metric "FAILED" 100)
        local retries=$(get_metric "Attempt 2/2" 100)
        
        local total=$((successes + failures))
        local success_rate=$(calculate_percentage $successes $total)
        local retry_rate=$(calculate_percentage $retries $attempts)
        
        echo -e "   Attempts:     $attempts"
        echo -e "   ${GREEN}✅ Successes:  $successes${NC}"
        echo -e "   ${RED}❌ Failures:   $failures${NC}"
        echo -e "   ${YELLOW}🔄 Retries:    $retries${NC}"
        
        if [ "$total" -gt 0 ]; then
            if [ "${success_rate%.*}" -ge 85 ]; then
                echo -e "   ${GREEN}Success Rate: ${success_rate}%${NC} ✅"
            elif [ "${success_rate%.*}" -ge 70 ]; then
                echo -e "   ${YELLOW}Success Rate: ${success_rate}%${NC} ⚠️"
            else
                echo -e "   ${RED}Success Rate: ${success_rate}%${NC} 🚨"
            fi
        fi
        
        echo ""
        
        # ========== QUALITY METRICS ==========
        echo -e "${GREEN}🎨 QUALITY METRICS${NC}"
        echo "────────────────────────────────────────────────────────────────────────────"
        
        local with_animations=$(get_metric "animations=true" 50)
        local without_animations=$(get_metric "animations=false" 50)
        local total_quality=$((with_animations + without_animations))
        
        if [ "$total_quality" -gt 0 ]; then
            local anim_rate=$(calculate_percentage $with_animations $total_quality)
            echo -e "   Animations:   ${with_animations}/${total_quality} (${anim_rate}%)"
        else
            echo -e "   Animations:   No data yet"
        fi
        
        # Extract label counts from last 5 quality logs
        echo -e "   Recent Labels:"
        get_last "Quality:" 5 | sed 's/.*labels=/   - /' | sed 's/,.*//' || echo "   - No data"
        
        echo ""
        
        # ========== ERRORS & WARNINGS ==========
        echo -e "${RED}⚠️  ERRORS & WARNINGS${NC}"
        echo "────────────────────────────────────────────────────────────────────────────"
        
        local empty_responses=$(get_metric "Empty text in response" 50)
        local malformed=$(get_metric "MALFORMED SVG" 50)
        local no_candidates=$(get_metric "No candidates" 50)
        local timeouts=$(get_metric "timeout" 50)
        
        echo -e "   Empty Responses:  $empty_responses"
        echo -e "   Malformed SVG:    $malformed"
        echo -e "   No Candidates:    $no_candidates"
        echo -e "   Timeouts:         $timeouts"
        
        local total_errors=$((empty_responses + malformed + no_candidates + timeouts))
        if [ "$total_errors" -gt 10 ]; then
            echo -e "   ${RED}🚨 HIGH ERROR RATE: $total_errors recent errors${NC}"
        elif [ "$total_errors" -gt 5 ]; then
            echo -e "   ${YELLOW}⚠️  Moderate errors: $total_errors${NC}"
        else
            echo -e "   ${GREEN}✅ Low error rate${NC}"
        fi
        
        echo ""
        
        # ========== PERFORMANCE ==========
        echo -e "${BLUE}⚡ PERFORMANCE${NC}"
        echo "────────────────────────────────────────────────────────────────────────────"
        
        echo -e "   Recent Generation Times:"
        get_last "Generated SVG in" 5 | sed 's/.*Generated SVG in /   - /' | sed 's/ (.*//' || echo "   - No data"
        
        echo ""
        
        # ========== CACHE METRICS ==========
        echo -e "${CYAN}💾 CACHE METRICS${NC}"
        echo "────────────────────────────────────────────────────────────────────────────"
        
        local cache_hits=$(get_metric "Using cached chunk" 100)
        local cache_misses=$(get_metric "MISS - No cached chunk" 100)
        local total_cache=$((cache_hits + cache_misses))
        
        if [ "$total_cache" -gt 0 ]; then
            local hit_rate=$(calculate_percentage $cache_hits $total_cache)
            echo -e "   Cache Hits:   $cache_hits"
            echo -e "   Cache Misses: $cache_misses"
            echo -e "   Hit Rate:     ${hit_rate}%"
        else
            echo -e "   No cache activity"
        fi
        
        echo ""
        
        # ========== RECENT ACTIVITY ==========
        echo -e "${YELLOW}📝 RECENT ACTIVITY${NC} (Last 8 entries)"
        echo "────────────────────────────────────────────────────────────────────────────"
        
        tail -n 150 "$LOG_FILE" 2>/dev/null | \
            grep -E "SUCCESS|FAILED|Generated|Generating step" | \
            tail -n 8 | \
            sed 's/.*\[/[/' | \
            sed 's/^/   /' || echo "   No recent activity"
        
        echo ""
        echo "================================================================================"
        echo "Press Ctrl+C to exit | Refreshing in ${REFRESH_INTERVAL}s..."
        
        sleep $REFRESH_INTERVAL
    done
}

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Error: Log file not found: $LOG_FILE"
    echo "Make sure the backend is running."
    exit 1
fi

# Start monitoring
monitor_loop
