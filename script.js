
    document.addEventListener('DOMContentLoaded', function() {
        const openWeatherApiKey = '8f9e910ec831c253a4b1359f5cbfff38';
        
        const S = id => document.getElementById(id);
        const searchForm = S('search-form'), cityInput = S('city-input'), cityNameElement = S('city-name');
        const dateElement = S('current-date'), currentWeatherIcon = S('current-weather-icon');
        const currentTemp = S('current-temp'), weatherDescription = S('weather-description');
        const feelsLike = S('feels-like'), humidity = S('humidity'), windSpeed = S('wind-speed');
        const forecastContainer = S('forecast-container'), loaderContainer = S('loader-container');
        const currentWeatherDetails = S('current-weather-details'), forecastCard = S('forecast-card');
        const healthDashboard = S('health-dashboard'), aqiHealthEl = S('aqi-health'), uvHealthEl = S('uv-health'), hydrationHealthEl = S('hydration-health');
        const todayForecastCard = S('today-forecast-card'), todayForecastContainer = S('today-forecast-container');
        const modalBackdrop = S('hourly-modal-backdrop'), modalCloseBtn = S('modal-close-btn');
        const sunriseSunsetCard = S('sunrise-sunset-card'), sunriseTimeEl = S('sunrise-time'), sunsetTimeEl = S('sunset-time'), dawnTimeEl = S('dawn-time'), duskTimeEl = S('dusk-time');
        const sunIcon = S('sun-icon'), sunPathProgress = S('sun-path-progress');

        const weatherScenes = { clearDay: S('clear-day-scene'), clouds: S('clouds-scene'), rain: S('rain-scene'), thunder: S('thunder-scene'), night: S('night-scene') };
        let currentAqiInfo = null;

        searchForm.addEventListener('submit', (e) => { e.preventDefault(); if (cityInput.value.trim()) fetchWeatherData(cityInput.value.trim()); });
        modalCloseBtn.addEventListener('click', closeHourlyModal);
        modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeHourlyModal(); });

        async function fetchWeatherData(city) {
            showLoading();
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${openWeatherApiKey}&units=metric`;
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${openWeatherApiKey}&units=metric`;
            try {
                const weatherRes = await fetch(weatherUrl);
                if (!weatherRes.ok) throw new Error(`City not found: ${city}`);
                const weatherData = await weatherRes.json();
                const { lat, lon } = weatherData.coord;
                const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}`;
                const uviUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}`;
                const [forecastRes, airQualityRes, uviRes] = await Promise.all([fetch(forecastUrl), fetch(airQualityUrl), fetch(uviUrl)]);
                const forecastData = await forecastRes.json();
                const airQualityData = await airQualityRes.json();
                const uviData = await uviRes.json();
                updateUI(weatherData, forecastData, airQualityData, uviData);
            } catch (error) {
                console.error("Error fetching data:", error);
                cityNameElement.textContent = `City not found`; dateElement.textContent = `Please check spelling.`;
                currentWeatherIcon.innerHTML = ''; hideLoading(true);
            }
        }
        
        function updateUI(current, forecast, airQuality, uvi) {
            cityNameElement.textContent = `${current.name}, ${current.sys.country}`;
            dateElement.textContent = new Date().toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
            currentWeatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png" alt="${current.weather[0].description}">`;
            currentTemp.textContent = Math.round(current.main.temp);
            weatherDescription.textContent = toTitleCase(current.weather[0].description);
            feelsLike.textContent = `${Math.round(current.main.feels_like)}°C`;
            humidity.textContent = `${current.main.humidity}%`;
            windSpeed.textContent = `${(current.wind.speed * 3.6).toFixed(1)} km/h`;
            
            updateSunriseSunset(current.sys.sunrise, current.sys.sunset, current.timezone);
            updateWeatherMood(current.weather[0]);
            updateHealthDashboard(airQuality.list[0].main.aqi, uvi.value, current.main.temp);
            displayTodaysForecast(processTodaysForecast(forecast.list));
            
            forecastContainer.innerHTML = '';
            const dailyForecasts = processForecastData(forecast.list);
            Object.values(dailyForecasts).slice(0, 4).forEach((data, index) => {
                const item = document.createElement('div'); item.style.animationDelay = `${index * 100}ms`;
                const fItem = document.createElement('div');
                fItem.className = 'forecast-item rounded-xl p-3 flex items-center justify-between cursor-pointer';
                fItem.innerHTML = `<div class="w-1/3 font-medium">${data.day}</div><div class="w-1/3 flex justify-center"><img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" class="w-10 h-10"></div><div class="w-1/3 text-right font-medium"><span>${Math.round(data.high)}°</span><span class="opacity-60 ml-2">${Math.round(data.low)}°</span></div>`;
                const hourlyDetails = createHourlyDetails(data.hourly);
                fItem.addEventListener('click', () => { document.querySelectorAll('.hourly-details.open').forEach(od => { if (od !== hourlyDetails) od.classList.remove('open'); }); hourlyDetails.classList.toggle('open'); });
                item.appendChild(fItem); item.appendChild(hourlyDetails);
                forecastContainer.appendChild(item);
            });
            hideLoading(false);
        }

        function formatTime(unixTimestamp, timezoneOffset) {
            const date = new Date((unixTimestamp + timezoneOffset) * 1000);
            return date.toLocaleTimeString('en-US', {
                timeZone: 'UTC',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }).replace(' ', '');
        }

        function updateSunriseSunset(sunrise, sunset, timezone) {
            const dawn = sunrise - (25 * 60); // Approx. 25 mins before sunrise
            const dusk = sunset + (25 * 60); // Approx. 25 mins after sunset

            sunriseTimeEl.textContent = formatTime(sunrise, timezone);
            sunsetTimeEl.textContent = formatTime(sunset, timezone);
            dawnTimeEl.textContent = formatTime(dawn, timezone);
            duskTimeEl.textContent = formatTime(dusk, timezone);
            
            // Animate Sun Path
            const now = Date.now() / 1000;
            const totalDaylight = sunset - sunrise;
            const elapsed = now - sunrise;
            let percentage = Math.max(0, Math.min(1, elapsed / totalDaylight));

            const pathLength = sunPathProgress.getTotalLength();
            sunPathProgress.style.strokeDasharray = pathLength;
            sunPathProgress.style.strokeDashoffset = pathLength * (1 - percentage);

            const point = sunPathProgress.getPointAtLength(pathLength * percentage);
            sunIcon.setAttribute('cx', point.x);
            sunIcon.setAttribute('cy', point.y);
        }

        function updateHealthDashboard(aqi, uv, temp) {
            currentAqiInfo = getAqiInfo(aqi);
            const uvInfo = getUvInfo(uv);
            const hydrationInfo = getHydrationInfo(temp);
            aqiHealthEl.innerHTML = `<h4 class="font-bold mb-1">${currentAqiInfo.title}</h4><p class="text-sm" style="color: var(--text-secondary)">${currentAqiInfo.text}</p>`;
            uvHealthEl.innerHTML = `<h4 class="font-bold mb-1">UV Index</h4><p class="text-sm" style="color: var(--text-secondary)">${uvInfo}</p>`;
            if (hydrationInfo) {
                hydrationHealthEl.innerHTML = `<h4 class="font-bold mb-1">Hydration Reminder</h4><p class="text-sm" style="color: var(--text-secondary)">${hydrationInfo}</p>`;
                hydrationHealthEl.style.display = 'block';
            } else {
                hydrationHealthEl.style.display = 'none';
            }
        }
        
        function getAqiInfo(aqi) {
            if (aqi === 1) return { title: 'Good', text: "Air quality is great! Perfect time for outdoor activities. 😊" };
            if (aqi === 2 || aqi === 3) return { title: 'Moderate', text: "Air quality is acceptable. Nothing to worry about for most people. 🙂" };
            if (aqi === 4) return { title: 'Unhealthy for Some', text: "Air quality is a bit poor. If you have asthma, you might want to limit time outside. 😷" };
            if (aqi >= 5) return { title: 'Unhealthy', text: "Air quality is unhealthy. Everyone should try to reduce long or intense outdoor activities. 😟" };
            return { title: 'N/A', text: 'Could not retrieve air quality data.' };
        }

        function getUvInfo(uv) {
            if (uv <= 2) return "UV risk is low. No need for sun protection. 👍";
            if (uv <= 5) return "UV risk is moderate. Wear a hat and use sunscreen if you'll be outside for a while. 🧴";
            if (uv <= 7) return "UV risk is high. Seek shade during midday hours and use sunscreen. 😎";
            if (uv > 7) return "UV risk is very high. Protect your skin and eyes. It's best to stay in the shade. ⛱️";
            return "Could not retrieve UV index data.";
        }

        function getHydrationInfo(temp) {
            if (temp > 38) return "Extreme heat today! Drink plenty of water and try to stay cool indoors. 🥵";
            if (temp > 32) return "It's a hot day! Remember to drink extra water to stay hydrated. 💧";
            return null;
        }
        
        function updateWeatherMood(weather) {
            Object.values(weatherScenes).forEach(scene => scene.classList.remove('active'));
            const isNight = weather.icon.includes('n');

            switch (weather.main) {
                case 'Clear': (isNight) ? weatherScenes.night.classList.add('active') : weatherScenes.clearDay.classList.add('active'); break;
                case 'Clouds': weatherScenes.clouds.classList.add('active'); break;
                case 'Rain': case 'Drizzle': case 'Mist': case 'Haze': case 'Fog': weatherScenes.rain.classList.add('active'); break;
                case 'Thunderstorm': weatherScenes.thunder.classList.add('active'); break;
                default: weatherScenes.clouds.classList.add('active');
            }
        }
        
        function processTodaysForecast(list) {
            const today = new Date().toISOString().slice(0, 10);
            return list.filter(item => item.dt_txt.slice(0, 10) === today).map(item => ({ time: item.dt_txt.slice(11, 16), temp: Math.round(item.main.temp), icon: item.weather[0].icon, feels_like: Math.round(item.main.feels_like), humidity: item.main.humidity, wind: (item.wind.speed * 3.6).toFixed(1) }));
        }

        function displayTodaysForecast(hourlyData) {
            todayForecastContainer.innerHTML = '';
            if (hourlyData.length === 0) { todayForecastCard.classList.add('hidden'); return; }
            hourlyData.forEach(h => {
                const hourDiv = document.createElement('div');
                hourDiv.className = 'flex-shrink-0 text-center bg-black/10 rounded-lg p-3 w-24 cursor-pointer transition-transform hover:scale-105';
                hourDiv.innerHTML = `<p class="font-semibold text-sm">${h.time}</p><img src="https://openweathermap.org/img/wn/${h.icon}.png" class="mx-auto w-12 h-12"><p class="font-bold text-lg">${h.temp}°C</p>`;
                hourDiv.addEventListener('click', () => openHourlyModal(h));
                todayForecastContainer.appendChild(hourDiv);
            });
        }

        function processForecastData(list) {
            const daily = {};
            list.forEach(item => {
                const date = item.dt_txt.slice(0, 10);
                if (date === new Date().toISOString().slice(0, 10)) return;
                if (!daily[date]) daily[date] = { temps: [], hourly: [], icons: {}, day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' }) };
                daily[date].temps.push(item.main.temp);
                daily[date].hourly.push({ time: item.dt_txt.slice(11, 16), temp: Math.round(item.main.temp), icon: item.weather[0].icon, feels_like: Math.round(item.main.feels_like), humidity: item.main.humidity, wind: (item.wind.speed * 3.6).toFixed(1) });
                const icon = item.weather[0].icon.slice(0, 2);
                daily[date].icons[icon] = (daily[date].icons[icon] || 0) + 1;
            });
            for (const date in daily) {
                daily[date].high = Math.max(...daily[date].temps); daily[date].low = Math.min(...daily[date].temps);
                daily[date].icon = Object.keys(daily[date].icons).reduce((a, b) => daily[date].icons[a] > daily[date].icons[b] ? a : b) + 'd';
            }
            return daily;
        }

        function createHourlyDetails(hourly) {
            const container = document.createElement('div');
            container.className = 'hourly-details text-center px-3';
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-4 sm:grid-cols-8 gap-2 text-sm';
            hourly.forEach(h => {
                const hourDiv = document.createElement('div');
                hourDiv.className = 'bg-black/10 rounded-lg py-2 cursor-pointer transition-transform hover:scale-105';
                hourDiv.innerHTML = `<p class="font-semibold">${h.time}</p><img src="https://openweathermap.org/img/wn/${h.icon}.png" class="mx-auto w-8 h-8"><p>${h.temp}°C</p>`;
                hourDiv.addEventListener('click', () => openHourlyModal(h));
                grid.appendChild(hourDiv);
            });
            container.appendChild(grid);
            return container;
        }

        function openHourlyModal(data) {
            S('modal-time').textContent = data.time;
            S('modal-icon').innerHTML = `<img src="https://openweathermap.org/img/wn/${data.icon}@4x.png" />`;
            S('modal-temp').textContent = `${data.temp}°C`;
            S('modal-feels-like').textContent = `${data.feels_like}°C`;
            S('modal-humidity').textContent = `${data.humidity}%`;
            S('modal-wind').textContent = `${data.wind} km/h`;
            S('modal-aqi').innerHTML = `${currentAqiInfo.title} <br> <small style="color:var(--text-secondary)">${currentAqiInfo.text}</small>`;
            modalBackdrop.classList.add('visible');
        }

        function closeHourlyModal() { modalBackdrop.classList.remove('visible'); }
        function showLoading() { loaderContainer.style.display = 'flex'; [currentWeatherDetails, forecastCard, healthDashboard, todayForecastCard, sunriseSunsetCard].forEach(el => el.classList.add('hidden')); }
        function hideLoading(isError) {
            loaderContainer.style.display = 'none';
            if (!isError) { [currentWeatherDetails, forecastCard, healthDashboard, todayForecastCard, sunriseSunsetCard].forEach(el => el.classList.remove('hidden')); }
        }
        function toTitleCase(str) { return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); }

        fetchWeatherData('Shirpur');
        
    });
