
    document.addEventListener('DOMContentLoaded', function() {
        const openWeatherApiKey = '8f9e910ec831c253a4b1359f5cbfff38';
        
        const S = id => document.getElementById(id); // Simple selector function
        const searchForm = S('search-form'), cityInput = S('city-input');
        const cityNameElement = S('city-name'), dateElement = S('current-date');
        const currentWeatherIcon = S('current-weather-icon'), currentTemp = S('current-temp');
        const weatherDescription = S('weather-description'), feelsLike = S('feels-like');
        const humidity = S('humidity'), windSpeed = S('wind-speed'), airQualityEl = S('air-quality');
        const forecastContainer = S('forecast-container'), loaderContainer = S('loader-container');
        const currentWeatherDetails = S('current-weather-details'), forecastCard = S('forecast-card');
        const themeToggle = S('checkbox');
        const modalBackdrop = S('hourly-modal-backdrop'), modalCloseBtn = S('modal-close-btn');

        const weatherScenes = {
            snow: S('snowy-scene'), rain: S('rainy-scene'), mild: S('sunny-mild'),
            bright: S('sunny-bright'), heat: S('heat-shimmer'),
        };
        
        let currentAirQuality = null;

        searchForm.addEventListener('submit', (e) => { e.preventDefault(); if (cityInput.value.trim()) fetchWeatherData(cityInput.value.trim()); });
        themeToggle.addEventListener('change', () => {
            document.documentElement.classList.toggle('dark', themeToggle.checked);
            localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
        });
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

                const [forecastRes, airQualityRes] = await Promise.all([fetch(forecastUrl), fetch(airQualityUrl)]);
                const forecastData = await forecastRes.json();
                const airQualityData = await airQualityRes.json();
                
                currentAirQuality = getAqiText(airQualityData.list[0].main.aqi);
                updateUI(weatherData, forecastData);
            } catch (error) {
                console.error("Error fetching data:", error);
                cityNameElement.textContent = `City not found`;
                dateElement.textContent = `Please check the spelling for "${city}".`;
                currentWeatherIcon.innerHTML = '';
                hideLoading(true);
            }
        }
        
        function updateUI(current, forecast) {
            cityNameElement.textContent = `${current.name}, ${current.sys.country}`;
            dateElement.textContent = new Date().toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
            currentWeatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png" alt="${current.weather[0].description}">`;
            currentTemp.textContent = Math.round(current.main.temp);
            weatherDescription.textContent = toTitleCase(current.weather[0].description);
            feelsLike.textContent = `${Math.round(current.main.feels_like)}°C`;
            humidity.textContent = `${current.main.humidity}%`;
            windSpeed.textContent = `${(current.wind.speed * 3.6).toFixed(1)} km/h`;
            airQualityEl.textContent = currentAirQuality;
            
            updateWeatherIllustration(current.main.temp);

            forecastContainer.innerHTML = '';
            const dailyForecasts = processForecastData(forecast.list);
            Object.values(dailyForecasts).slice(0, 4).forEach((data, index) => {
                const item = document.createElement('div');
                item.style.animationDelay = `${index * 100}ms`;
                
                const fItem = document.createElement('div');
                fItem.className = 'forecast-item rounded-xl p-3 flex items-center justify-between cursor-pointer';
                fItem.innerHTML = `<div class="w-1/3 font-medium">${data.day}</div> <div class="w-1/3 flex justify-center"><img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" class="w-10 h-10"></div> <div class="w-1/3 text-right font-medium"><span>${Math.round(data.high)}°</span><span class="opacity-60 ml-2">${Math.round(data.low)}°</span></div>`;
                
                const hourlyDetails = createHourlyDetails(data.hourly);
                fItem.addEventListener('click', () => {
                    document.querySelectorAll('.hourly-details.open').forEach(od => { if (od !== hourlyDetails) od.classList.remove('open'); });
                    hourlyDetails.classList.toggle('open');
                });

                item.appendChild(fItem); item.appendChild(hourlyDetails);
                forecastContainer.appendChild(item);
            });
            hideLoading(false);
        }

        function getAqiText(aqi) {
            switch (aqi) {
                case 1: return 'Good'; case 2: return 'Fair';
                case 3: return 'Moderate'; case 4: return 'Poor';
                case 5: return 'Very Poor'; default: return 'N/A';
            }
        }

        function updateWeatherIllustration(temp) {
            Object.values(weatherScenes).forEach(scene => scene.classList.remove('active'));
            if (temp <= 0) { weatherScenes.snow.classList.add('active'); createParticles(weatherScenes.snow, 50, 'snowflake'); } 
            else if (temp > 0 && temp <= 15) { weatherScenes.rain.classList.add('active'); createParticles(weatherScenes.rain, 60, 'raindrop'); } 
            else if (temp > 15 && temp <= 25) { weatherScenes.mild.classList.add('active'); } 
            else if (temp > 25 && temp <= 35) { weatherScenes.bright.classList.add('active'); } 
            else { weatherScenes.heat.classList.add('active'); }
        }
        
        function createParticles(container, count, className) {
            container.innerHTML = ''; 
            for (let i = 0; i < count; i++) {
                const p = document.createElement('div');
                p.className = className;
                if (className === 'snowflake') {
                    const size = Math.random() * 4 + 2;
                    p.style.width = `${size}px`; p.style.height = `${size}px`;
                    p.style.animationDuration = `${Math.random() * 5 + 5}s`;
                } else {
                    p.style.animationDuration = `${Math.random() * 0.5 + 0.5}s`;
                }
                p.style.left = `${Math.random() * 100}vw`;
                p.style.animationDelay = `${Math.random() * 5}s`;
                container.appendChild(p);
            }
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
                hourDiv.className = 'bg-white/10 dark:bg-black/10 rounded-lg py-2 cursor-pointer transition-transform hover:scale-105';
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
            S('modal-aqi').textContent = currentAirQuality;
            modalBackdrop.classList.add('visible');
        }

        function closeHourlyModal() { modalBackdrop.classList.remove('visible'); }
        function showLoading() { loaderContainer.style.display = 'flex'; currentWeatherDetails.classList.add('hidden'); forecastCard.classList.add('hidden'); }
        function hideLoading(isError) {
            loaderContainer.style.display = 'none';
            if (!isError) { currentWeatherDetails.classList.remove('hidden'); forecastCard.classList.remove('hidden'); }
        }
        function toTitleCase(str) { return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); }

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark'); themeToggle.checked = true;
        }
        fetchWeatherData('Shirpur');
    });
