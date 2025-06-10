// Global variables
let currentLat = null;
let currentLon = null;
let weatherMap = null;
let currentMapLayer = 'temp';
let isRefreshing = false;
const L = window.L; // Declare the L variable

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeSearch();
    initializeLocationButton();
    loadCurrentWeather();
});

// Tab functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.navbar-item');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Load content based on tab
            switch(tabName) {
                case 'forecast':
                    loadForecast();
                    break;
                case 'maps':
                    initializeMap();
                    break;
                case 'alerts':
                    loadAlerts();
                    break;
            }
        });
    });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('location-search');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length < 3) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchLocations(query);
        }, 300);
    });
    
    searchBtn.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
            searchLocations(query);
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                searchLocations(query);
            }
        }
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function initializeLocationButton() {
    const locationBtn = document.getElementById('location-btn');
    locationBtn.addEventListener('click', function() {
        loadCurrentWeather();
    });
}

// Search for locations
async function searchLocations(query) {
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Search error:', data.error);
            return;
        }
        
        displaySearchResults(data.locations);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

function displaySearchResults(locations) {
    const searchResults = document.getElementById('search-results');
    
    if (locations.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No locations found</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    const resultsHTML = locations.map(location => {
        const displayName = location.state 
            ? `${location.name}, ${location.state}, ${location.country}`
            : `${location.name}, ${location.country}`;
        
        return `
            <div class="search-result-item" onclick="selectLocation(${location.lat}, ${location.lon}, '${location.name}')">
                ${displayName}
            </div>
        `;
    }).join('');
    
    searchResults.innerHTML = resultsHTML;
    searchResults.style.display = 'block';
}

function selectLocation(lat, lon, name) {
    currentLat = lat;
    currentLon = lon;
    
    // Hide search results
    document.getElementById('search-results').style.display = 'none';
    
    // Clear search input
    document.getElementById('location-search').value = name;
    
    // Load weather for selected location
    loadWeatherForLocation(lat, lon);
    
    // If forecast tab is active, load forecast
    if (document.getElementById('forecast-tab').classList.contains('active')) {
        loadForecast();
    }
    
    // If alerts tab is active, load alerts
    if (document.getElementById('alerts-tab').classList.contains('active')) {
        loadAlerts();
    }
    
    // Update map if it's initialized
    if (weatherMap) {
        weatherMap.setView([lat, lon], 10);
    }
}

// Load current weather using geolocation
function loadCurrentWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLat = position.coords.latitude;
                currentLon = position.coords.longitude;
                loadWeatherForLocation(currentLat, currentLon);
            },
            function(error) {
                showWeatherError("Location access denied. Please enable location services or search for a city.");
            }
        );
    } else {
        showWeatherError("Geolocation is not supported by this browser.");
    }
}

// Load weather for specific coordinates
async function loadWeatherForLocation(lat, lon) {
    try {
        const response = await fetch(`/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (data.error) {
            showWeatherError(data.error);
            return;
        }
        
        displayCurrentWeather(data);
    } catch (error) {
        showWeatherError("Failed to load weather data. Please check your connection.");
    }
}

function displayCurrentWeather(data) {
    const weatherDisplay = document.getElementById('weather');
    const weatherDetails = document.getElementById('weather-details');
    const weatherIcon = getWeatherIcon(data.description, data.icon);

    weatherDisplay.innerHTML = `
        <div class="weather-main highlight-weather">
            <div class="location-name">${data.location}</div>
            <div class="weather-icon-large">${weatherIcon}</div>
            <div class="temperature-display main-stat">${data.temperature}°C</div>
            <div class="weather-stats-row">
                <div class="stat-block humidity-block">
                    <span class="stat-label">Humidity</span>
                    <span class="stat-value">${data.humidity}%</span>
                </div>
                <div class="stat-block pressure-block">
                    <span class="stat-label">Pressure</span>
                    <span class="stat-value">${data.pressure} hPa</span>
                </div>
            </div>
            <div class="weather-description">${data.description}</div>
        </div>
    `;

    // Update detail values
    document.getElementById('feels-like').textContent = `${data.feels_like}°C`;
    document.getElementById('humidity').textContent = `${data.humidity}%`;
    document.getElementById('wind').textContent = `${data.wind_speed} m/s`;
    document.getElementById('pressure').textContent = `${data.pressure} hPa`;
    document.getElementById('visibility').textContent = `${data.visibility} km`;

    weatherDetails.style.display = 'block';
}

function showWeatherError(message) {
    const weatherDisplay = document.getElementById('weather');
    const weatherDetails = document.getElementById('weather-details');
    
    weatherDisplay.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <p class="error-text">${message}</p>
            <button class="retry-btn" onclick="loadCurrentWeather()">Try Again</button>
        </div>
    `;
    
    weatherDetails.style.display = 'none';
}

// Load forecast
async function loadForecast() {
    if (!currentLat || !currentLon) {
        document.getElementById('forecast-content').innerHTML = `
            <div class="loading-container">
                <p class="loading-text">Please select a location first</p>
            </div>
        `;
        return;
    }
    
    document.getElementById('forecast-content').innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading forecast...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/forecast?lat=${currentLat}&lon=${currentLon}`);
        const data = await response.json();
        
        if (data.error) {
            document.getElementById('forecast-content').innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <p class="error-text">${data.error}</p>
                </div>
            `;
            return;
        }
        
        displayForecast(data.forecasts);
    } catch (error) {
        document.getElementById('forecast-content').innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <p class="error-text">Failed to load forecast data</p>
            </div>
        `;
    }
}

function displayForecast(forecasts) {
    const forecastHTML = forecasts.map(forecast => {
        const weatherIcon = getWeatherIcon(forecast.description, forecast.icon);
        return `
            <div class="forecast-card">
                <div class="forecast-day">${forecast.day}</div>
                <div class="forecast-icon">${weatherIcon}</div>
                <div class="forecast-temps main-stat">${forecast.temp_max}° / ${forecast.temp_min}°</div>
                <div class="forecast-row">
                    <span class="forecast-humidity stat-block humidity-block">💧 <span class="stat-label">Humidity</span> <span class="stat-value">${forecast.humidity}%</span></span>
                    <span class="forecast-pressure stat-block pressure-block">📊 <span class="stat-label">Pressure</span> <span class="stat-value">${forecast.pressure ? forecast.pressure + ' hPa' : '--'}</span></span>
                </div>
                <div class="forecast-desc">${forecast.description}</div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-light);">
                    🌪️ ${forecast.wind_speed} m/s
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('forecast-content').innerHTML = forecastHTML;
}

// Initialize weather map
function initializeMap() {
    if (weatherMap) {
        return; // Map already initialized
    }
    
    const mapContainer = document.getElementById('weather-map');
    
    // Default coordinates (center of US)
    const defaultLat = currentLat || 39.8283;
    const defaultLon = currentLon || -98.5795;
    
    weatherMap = L.map('weather-map').setView([defaultLat, defaultLon], currentLat ? 10 : 4);
    
    // Add base map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(weatherMap);
    
    // Add weather layer
    updateMapLayer(currentMapLayer);
    
    // Initialize map layer controls
    initializeMapControls();
    
    // Add marker for current location if available
    if (currentLat && currentLon) {
        L.marker([currentLat, currentLon])
            .addTo(weatherMap)
            .bindPopup('Current Location')
            .openPopup();
    }
}

function initializeMapControls() {
    const mapLayerBtns = document.querySelectorAll('.map-layer-btn');
    
    mapLayerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const layer = this.getAttribute('data-layer');
            
            // Remove active class from all buttons
            mapLayerBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update map layer
            currentMapLayer = layer;
            updateMapLayer(layer);
        });
    });
}

function updateMapLayer(layerType) {
    if (!weatherMap) return;
    
    // Remove existing weather layers
    weatherMap.eachLayer(layer => {
        if (layer.options && layer.options.attribution && layer.options.attribution.includes('OpenWeatherMap')) {
            weatherMap.removeLayer(layer);
        }
    });
    
    // Add new weather layer
    const apiKey = '513ac89139e303f8f740a2edda23c760'; 
    let layerUrl = '';
    
    switch(layerType) {
        case 'temp':
            layerUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`;
            break;
        case 'precipitation':
            layerUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`;
            break;
        case 'wind':
            layerUrl = `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`;
            break;
        case 'clouds':
            layerUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`;
            break;
    }
    
    if (layerUrl) {
        L.tileLayer(layerUrl, {
            attribution: '© OpenWeatherMap',
            opacity: 0.6
        }).addTo(weatherMap);
    }
}

// Load weather alerts
async function loadAlerts() {
    if (!currentLat || !currentLon) {
        document.getElementById('alerts-content').innerHTML = `
            <div class="loading-container">
                <p class="loading-text">Please select a location first</p>
            </div>
        `;
        return;
    }
    
    document.getElementById('alerts-content').innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading alerts...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/alerts?lat=${currentLat}&lon=${currentLon}`);
        const data = await response.json();
        
        if (data.error) {
            document.getElementById('alerts-content').innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <p class="error-text">${data.error}</p>
                </div>
            `;
            return;
        }
        
        displayAlerts(data.alerts);
    } catch (error) {
        document.getElementById('alerts-content').innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <p class="error-text">Failed to load alerts data</p>
            </div>
        `;
    }
}

function displayAlerts(alerts) {
    if (alerts.length === 0) {
        document.getElementById('alerts-content').innerHTML = `
            <div class="no-alerts">
                <div class="no-alerts-icon">✅</div>
                <p>No weather alerts for this location</p>
            </div>
        `;
        return;
    }
    
    const alertsHTML = alerts.map(alert => {
        const severityClass = alert.severity || 'moderate';
        const endTime = alert.end ? ` - ${alert.end}` : '';
        
        return `
            <div class="alert-item ${severityClass}">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-time">
                    <strong>Active:</strong> ${alert.start}${endTime}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('alerts-content').innerHTML = alertsHTML;
}

// Utility functions
function getWeatherIcon(description, iconCode) {
    if (iconCode) {
        // Use OpenWeatherMap icon codes for more accurate icons
        const iconMap = {
            '01d': '☀️', '01n': '🌙',
            '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️',
            '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️',
            '10d': '🌦️', '10n': '🌧️',
            '11d': '⛈️', '11n': '⛈️',
            '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };
        return iconMap[iconCode] || '🌤️';
    }
    
    // Fallback to description-based icons
    const desc = description.toLowerCase();
    if (desc.includes('sun') || desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('storm')) return '⛈️';
    if (desc.includes('fog') || desc.includes('mist')) return '🌫️';
    return '🌤️';
}

function refreshWeather() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    updateRefreshButton();
    
    if (currentLat && currentLon) {
        loadWeatherForLocation(currentLat, currentLon);
    } else {
        loadCurrentWeather();
    }
    
    setTimeout(() => {
        isRefreshing = false;
        updateRefreshButton();
    }, 2000);
}

function updateRefreshButton() {
    const btn = document.getElementById('refresh-btn');
    if (isRefreshing) {
        btn.classList.add('refreshing');
        btn.innerHTML = '<span class="btn-icon spinning">🔄</span>Refreshing...';
    } else {
        btn.classList.remove('refreshing');
        btn.innerHTML = '<span class="btn-icon">🔄</span>Refresh Weather';
    }
}