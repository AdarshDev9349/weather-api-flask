from flask import Flask, render_template, request, jsonify
import requests
import os
from datetime import datetime

app = Flask(__name__)

# Get your API key from https://openweathermap.org/api
OPENWEATHER_API_KEY = "513ac89139e303f8f740a2edda23c760"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/weather")
def weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing coordinates"}), 400
    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "API key not set"}), 500
    
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    resp = requests.get(url)
    
    if resp.status_code != 200:
        return jsonify({"error": "Failed to fetch weather"}), 500
    
    data = resp.json()
    return jsonify({
        "location": data.get("name"),
        "temperature": round(data["main"]["temp"]),
        "description": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "pressure": data["main"]["pressure"],
        "wind_speed": data["wind"]["speed"],
        "wind_direction": data["wind"].get("deg", 0),
        "feels_like": round(data["main"]["feels_like"]),
        "visibility": data.get("visibility", 0) / 1000,  # Convert to km
        "icon": data["weather"][0]["icon"]
    })

@app.route("/forecast")
def forecast():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing coordinates"}), 400
    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "API key not set"}), 500
    
    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    resp = requests.get(url)
    
    if resp.status_code != 200:
        return jsonify({"error": "Failed to fetch forecast"}), 500
    
    data = resp.json()
    
    # Process forecast data - get daily forecasts
    daily_forecasts = {}
    for item in data["list"]:
        date = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")
        if date not in daily_forecasts:
            daily_forecasts[date] = {
                "date": date,
                "day": datetime.fromtimestamp(item["dt"]).strftime("%A"),
                "temp_min": item["main"]["temp"],
                "temp_max": item["main"]["temp"],
                "description": item["weather"][0]["description"],
                "icon": item["weather"][0]["icon"],
                "humidity": item["main"]["humidity"],
                "pressure": item["main"]["pressure"],
                "wind_speed": item["wind"]["speed"],
                "pressure_count": 1,
                "humidity_count": 1
            }
        else:
            daily_forecasts[date]["temp_min"] = min(daily_forecasts[date]["temp_min"], item["main"]["temp"])
            daily_forecasts[date]["temp_max"] = max(daily_forecasts[date]["temp_max"], item["main"]["temp"])
            daily_forecasts[date]["humidity"] += item["main"]["humidity"]
            daily_forecasts[date]["pressure"] += item["main"]["pressure"]
            daily_forecasts[date]["humidity_count"] += 1
            daily_forecasts[date]["pressure_count"] += 1
    # Convert to list and round temperatures, humidity, and pressure
    forecast_list = []
    for forecast in list(daily_forecasts.values())[:5]:  # 5-day forecast
        forecast["temp_min"] = round(forecast["temp_min"])
        forecast["temp_max"] = round(forecast["temp_max"])
        forecast["humidity"] = round(forecast["humidity"] / forecast["humidity_count"])
        forecast["pressure"] = round(forecast["pressure"] / forecast["pressure_count"])
        forecast_list.append(forecast)
    
    return jsonify({
        "location": data["city"]["name"],
        "forecasts": forecast_list
    })

@app.route("/search")
def search_location():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400
    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "API key not set"}), 500
    
    url = f"https://api.openweathermap.org/geo/1.0/direct?q={query}&limit=5&appid={OPENWEATHER_API_KEY}"
    resp = requests.get(url)
    
    if resp.status_code != 200:
        return jsonify({"error": "Failed to search locations"}), 500
    
    data = resp.json()
    locations = []
    
    for item in data:
        location = {
            "name": item["name"],
            "country": item["country"],
            "state": item.get("state", ""),
            "lat": item["lat"],
            "lon": item["lon"]
        }
        locations.append(location)
    
    return jsonify({"locations": locations})

@app.route("/alerts")
def weather_alerts():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"error": "Missing coordinates"}), 400
    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "API key not set"}), 500
    
    # Using One Call API for alerts (requires subscription for alerts)
    url = f"https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    resp = requests.get(url)
    
    if resp.status_code != 200:
        # Fallback: return empty alerts if One Call API is not available
        return jsonify({"alerts": []})
    
    data = resp.json()
    alerts = data.get("alerts", [])
    
    processed_alerts = []
    for alert in alerts:
        processed_alert = {
            "title": alert.get("event", "Weather Alert"),
            "description": alert.get("description", ""),
            "severity": alert.get("tags", ["moderate"])[0] if alert.get("tags") else "moderate",
            "start": datetime.fromtimestamp(alert["start"]).strftime("%Y-%m-%d %H:%M"),
            "end": datetime.fromtimestamp(alert["end"]).strftime("%Y-%m-%d %H:%M") if alert.get("end") else None
        }
        processed_alerts.append(processed_alert)
    
    return jsonify({"alerts": processed_alerts})

if __name__ == "__main__":
    app.run(debug=True)