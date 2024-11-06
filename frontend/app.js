document.addEventListener("DOMContentLoaded", () => {
    const citySelect = document.getElementById("city-select");
    const prayerTimesDiv = document.getElementById("prayer-times");
    const countdownDiv = document.getElementById("countdown");
    const dateDiv = document.getElementById("date");

    let countdownInterval;
    let prayerData;

    
    // Function to format time to today’s date for countdown calculations
    function parseTimeToToday(timeStr) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        return today;
    }

    // Base URL for DigitalOcean Spaces
    const SPACES_BASE_URL = 'https://adhan-data.nyc3.cdn.digitaloceanspaces.com';

    // Helper function to format date as "DD-MM-YYYY"
    function getFormattedDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // Fetch prayer times from DigitalOcean Spaces
    async function fetchPrayerTimes(city) {
        const todayFormatted = getFormattedDate();
        const response = await fetch(`${SPACES_BASE_URL}/prayer_times_${todayFormatted}.json`);

        if (!response.ok) throw new Error("Failed to fetch prayer times");

        const data = await response.json();
        prayerData = data.data[city];

        displayPrayerTimes(prayerData, city);
        startCitySpecificCountdown(prayerData);
    }

    // Display prayer times for the selected city
    function displayPrayerTimes(timings, city) {
        prayerTimesDiv.innerHTML = `<h2>Prayer Times for ${city}</h2><ul>`;
        const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
        prayerNames.forEach(prayer => {
            const time = timings[prayer];
            const prayerBar = document.createElement("div");
            prayerBar.className = "prayer-bar";

            const prayerName = document.createElement("span");
            prayerName.className = "prayer-name";
            prayerName.textContent = prayer;

            const prayerTime = document.createElement("span");
            prayerTime.className = "prayer-time";
            prayerTime.textContent = time;

            prayerBar.appendChild(prayerName);
            prayerBar.appendChild(prayerTime);
            prayerTimesDiv.appendChild(prayerBar);
        });
        prayerTimesDiv.innerHTML += `</ul>`;
        displayDate();
    }

    // Display the current date in both Gregorian and Hijri formats
    function displayDate() {
        const today = new Date();
        const gregorianDate = today.toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' });
        const hijriDate = new Intl.DateTimeFormat("en-TN-u-ca-islamic", { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
        dateDiv.innerHTML = `<p>Gregorian Date: ${gregorianDate}</p><p>Hijri Date: ${hijriDate}</p>`;
    }

    // Update the background based on the current prayer time period
    function updateBackground(timings, currentTime) {
        const fajrTime = parseTimeToToday(timings.Fajr);
        const sunriseTime = parseTimeToToday(timings.Sunrise);
        const dhuhrTime = parseTimeToToday(timings.Dhuhr);
        const asrTime = parseTimeToToday(timings.Asr);
        const maghribTime = parseTimeToToday(timings.Maghrib);
        const ishaTime = parseTimeToToday(timings.Isha);

        let background;

        if (currentTime >= fajrTime && currentTime < sunriseTime) {
            background = "linear-gradient(to bottom, #ffdfba, #ffab73)";
        } else if (currentTime >= sunriseTime && currentTime < dhuhrTime) {
            background = "linear-gradient(to bottom, #87ceeb, #ffcccb)";
        } else if (currentTime >= dhuhrTime && currentTime < asrTime) {
            background = "linear-gradient(to bottom, #b0e0e6, #fffacd)";
        } else if (currentTime >= asrTime && currentTime < maghribTime) {
            background = "linear-gradient(to bottom, #ffa500, #ffcccb)";
        } else if (currentTime >= maghribTime && currentTime < ishaTime) {
            background = "linear-gradient(to bottom, #ff4500, #2a2a72)";
        } else {
            background = "linear-gradient(to bottom, #0d1b2a, #1e3c72)";
        }

        document.body.style.background = background;
    }

    // Start countdown to the next prayer time
    function startCitySpecificCountdown(timings) {
        clearInterval(countdownInterval);

        function getNextPrayerTime() {
            const now = new Date();
            const prayerTimes = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
            let nextPrayerName = null;
            let nextPrayerTime = null;

            for (const prayer of prayerTimes) {
                const prayerTime = parseTimeToToday(timings[prayer]);
                if (prayerTime > now) {
                    nextPrayerName = prayer;
                    nextPrayerTime = prayerTime;
                    break;
                }
            }

            if (!nextPrayerTime) {
                const fajrTime = parseTimeToToday(timings["Fajr"]);
                fajrTime.setDate(fajrTime.getDate() + 1);
                nextPrayerName = "Fajr (Next Day)";
                nextPrayerTime = fajrTime;
            }

            return { nextPrayerName, nextPrayerTime };
        }

        function updateCountdown() {
            const { nextPrayerName, nextPrayerTime } = getNextPrayerTime();
            updateBackground(timings, new Date());

            countdownInterval = setInterval(() => {
                const now = new Date();
                const timeRemaining = nextPrayerTime - now;

                if (timeRemaining <= 0) {
                    clearInterval(countdownInterval);
                    fetchPrayerTimes(citySelect.value);
                } else {
                    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
                    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
                    const seconds = Math.floor((timeRemaining / 1000) % 60);
                    countdownDiv.innerHTML = `<p>Next Prayer: ${nextPrayerName} in ${hours}h ${minutes}m ${seconds}s</p>`;
                }
            }, 1000);
        }

        updateCountdown();
    }

    citySelect.value = "Göteborg";

    const defaultCity = "Göteborg";
    fetchPrayerTimes(defaultCity);

    citySelect.addEventListener("change", () => {
        fetchPrayerTimes(citySelect.value);
    });
});
