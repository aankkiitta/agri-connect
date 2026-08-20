/**
 * SMART AGRICULTURE ADVISOR - CORE ENGINE
 * Version: 2.0.0 (2026 Edition)
 */

const AgriAdvisor = (() => {
    // Private State
    const API_KEY = '831278baa7f0423d67c09c1715434eb2';
    let cropDatabase = [];

    /**
     * MODULE 1: Initialization & Data Loading
     */
    const init = async () => {
        try {
            const response = await fetch('crops.json');
            cropDatabase = await response.json();
            console.log("Agri-Intelligence Loaded.");
        } catch (err) {
            console.error("Failed to load crop database.");
        }
    };

    /**
     * MODULE 2: Financial Calculator
     * Uses professional agri-finance formulas
     */
    const calculateEconomics = (crop, area) => {
        const totalYield = crop.yieldPerAcre * area;
        const grossRevenue = totalYield * crop.marketPrice;
        const totalCost = crop.costPerAcre * area;
        const netProfit = grossRevenue - totalCost;
        const roi = ((netProfit / totalCost) * 100).toFixed(1);

        return {
            profit: netProfit.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
            roi: `${roi}%`
        };
    };

    /**
     * MODULE 3: Pest & Disease Risk Intelligence
     * Logic based on Temperature Humidity Index (THI)
     */
    const assessRisks = (temp, humidity) => {
        // High Humidity (>75%) and Moderate Temp (20-28°C) favors Fungal growth
        const isFungalRisk = humidity > 75 && temp > 20 && temp < 28;
        const isHeatStress = temp > 35;

        return {
            level: isFungalRisk || isHeatStress ? 'HIGH' : 'LOW',
            message: isFungalRisk 
                ? "⚠️ Warning: High humidity detected. High risk of Rice Blast/Mildew." 
                : isHeatStress ? "⚠️ Warning: Extreme heat. Risk of moisture loss and wilting."
                : "✅ Conditions are stable. Standard monitoring recommended."
        };
    };

    /**
     * MODULE 4: Main Execution Engine
     */
    const runAnalysis = async () => {
        const city = document.getElementById('cityInput').value;
        const cropKey = document.getElementById('cropSelect').value;
        const area = parseFloat(document.getElementById('areaInput').value);
        const btn = document.getElementById('analyzeBtn');

        if (!city || !cropKey || isNaN(area)) {
            alert("Please provide valid City, Crop, and Farm Area.");
            return;
        }

        // UI State: Loading
        btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Processing Data...';
        btn.disabled = true;

        try {
            // Fetch Weather
            const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`);
            if (!weatherRes.ok) throw new Error("City not found");
            const weather = await weatherRes.json();

            // Match Crop
            const cropData = cropDatabase.find(c => c.aliases.includes(cropKey.toLowerCase()));
            
            // Generate Insights
            const temp = Math.round(weather.main.temp);
            const humidity = weather.main.humidity;
            const risk = assessRisks(temp, humidity);
            const finance = calculateEconomics(cropData, area);

            // Update UI
            updateUI(temp, humidity, weather.weather[0].main, risk, finance, cropData);

        } catch (err) {
            alert(err.message);
        } finally {
            btn.innerHTML = '<i class="fas fa-microchip"></i> Start Analysis';
            btn.disabled = false;
        }
    };

    /**
     * MODULE 5: UI Renderer
     */
    const updateUI = (temp, humidity, condition, risk, finance, crop) => {
        document.getElementById('resultsArea').style.display = 'block';

        // Weather Card
        document.getElementById('tempVal').innerText = `${temp}°C`;
        document.getElementById('weatherDesc').innerText = `${condition} | Humidity: ${humidity}%`;
        
        const irrigationMsg = (humidity > 80) 
            ? "🛑 Skip Irrigation: High moisture detected." 
            : "💧 Irrigate: Low humidity detected, ensure soil hydration.";
        document.getElementById('irrigationBadge').innerText = irrigationMsg;

        // Risk Meter
        const riskLevel = document.getElementById('riskLevel');
        const riskBar = document.getElementById('riskBar');
        riskLevel.innerText = risk.level;
        riskLevel.className = `risk-badge ${risk.level.toLowerCase()}`;
        riskBar.style.width = risk.level === 'HIGH' ? '85%' : '20%';
        riskBar.className = `risk-bar-fill ${risk.level.toLowerCase()}`;
        document.getElementById('pestAdvice').innerText = risk.message;

        // Finance Card
        document.getElementById('profitVal').innerText = finance.profit;
        document.getElementById('fertVal').innerText = crop.fertilizer;

        // Timeline Builder
        renderTimeline(crop.timeline);

        // Professional UX: Auto-scroll to results
        document.getElementById('resultsArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const renderTimeline = (steps) => {
        const container = document.getElementById('timelineContainer');
        container.innerHTML = steps.map(step => `
            <div class="schedule-item">
                <div class="schedule-icon ${step.week <= 4 ? 'water' : 'nutrient'}">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="schedule-content">
                    <h4>Week ${step.week}: ${step.stage}</h4>
                    <p>${step.task}</p>
                    <small><strong>Resource Needed:</strong> ${step.equipment}</small>
                </div>
            </div>
        `).join('');
    };

    // Public API
    return { init, runAnalysis };
})();

// Initialize on Load
document.addEventListener('DOMContentLoaded', AgriAdvisor.init);

// Global wrapper for HTML button
const runAnalysis = () => AgriAdvisor.runAnalysis();