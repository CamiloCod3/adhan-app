document.addEventListener("DOMContentLoaded", () => {

    // List of prayer names in English, Swedish, and Arabic for display purposes
    const prayerNames = [
        { english: "Fajr", swedish: "Fajr", arabic: "الفجر" },
        { english: "Sunrise", swedish: "Shuruk ☀️", arabic: "شروق الشمس" },
        { english: "Dhuhr", swedish: "Dhuhr", arabic: "الظهر" },
        { english: "Asr", swedish: "Asr", arabic: "العصر" },
        { english: "Maghrib", swedish: "Maghrib", arabic: "المغرب" },
        { english: "Isha", swedish: "Isha", arabic: "العشاء" }
    ];
    
    // Select DOM elements for prayer times, city selection, countdown, and date display
    const citySelect = document.getElementById("city-select");
    const prayerTimesDiv = document.getElementById("prayer-times");
    const countdownDiv = document.getElementById("countdown");
    const dateDiv = document.getElementById("date");
    const header = document.querySelector("h1"); // Select the header element for dynamic updates

    let countdownInterval;
    let prayerData; // Holds prayer times data for the selected city
    let lastUpdateDate = null; // Tracks the last fetched date to detect changes

    // Helper function to parse a time string (e.g., "04:58") into a Date object for today
    function parseTimeToToday(timeStr) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        return today;
    }

    // Base URL for accessing the DigitalOcean Spaces storage
    const SPACES_BASE_URL = 'https://adhan-data.nyc3.cdn.digitaloceanspaces.com';

    // Fetches prayer times from the JSON file in the DigitalOcean Space for the specified city
    async function fetchPrayerTimes(city) {
        try {
            const response = await fetch(`${SPACES_BASE_URL}/prayer_times.json?timestamp=${Date.now()}`);
            if (!response.ok) throw new Error(`Failed to fetch prayer times: ${response.statusText}`);
            const data = await response.json();
            console.log("Fetched Data:", data); // Debug log for inspecting the JSON structure
            const currentDate = data.date;
    
            if (currentDate !== lastUpdateDate) {
                lastUpdateDate = currentDate;
                prayerData = data.data[city];
                updateHeader(city);
                displayPrayerTimes(prayerData, city);
                startCitySpecificCountdown(prayerData);
            }
        } catch (error) {
            console.error("Error fetching prayer times:", error);
            prayerTimesDiv.innerHTML = `<p style="color:red;">Failed to load prayer times. Please try again later.</p>`;
        }
    }

    // Function to update header based on selected city
    function updateHeader(city) {
        header.textContent = `Bönetider: ${city}`;
    }

    // Polling function that limits checks to 3 times with a 15-minute interval after 12:16 AM
    function startLimitedPolling() {
        const maxAttempts = 3; // Maximum number of polling attempts
        const pollingInterval = 15 * 60 * 1000; // 15 minutes in milliseconds
        let attempts = 0; // Counter for polling attempts

        // Set up interval for polling
        const pollInterval = setInterval(() => {
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval); // Stop polling after max attempts
                return;
            }
            fetchPrayerTimes(citySelect.value); // Fetch updated prayer times if available
            attempts += 1;
        }, pollingInterval);
    }

    // Schedules polling to start at 12:16 AM each day
    function startPollingAfterMidnight() {
        const now = new Date();
        const targetTime = new Date(now);
        targetTime.setHours(0, 16, 0, 0); // Set target to 12:16 AM

        // If the current time is past 12:16 AM, schedule for the next day
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const timeUntilTarget = targetTime - now;

        // Set a timeout to start limited polling at 12:16 AM
        setTimeout(() => {
            startLimitedPolling(); // Begin the limited polling process after 12:16 AM
        }, timeUntilTarget);
    }

    // Display prayer times for the selected city
    function displayPrayerTimes(timings, city) {
        prayerTimesDiv.innerHTML = "<ul>";
        prayerNames.forEach(prayer => {
            const time = timings[prayer.english];
            const prayerBar = document.createElement("div");
            prayerBar.className = "prayer-bar";

            const prayerName = document.createElement("span");
            prayerName.className = "prayer-name";
            prayerName.innerHTML = `${prayer.swedish} (${prayer.arabic})`; // Display both Swedish and Arabic names

            const prayerTime = document.createElement("span");
            prayerTime.className = "prayer-time";
            prayerTime.textContent = time;

            prayerBar.appendChild(prayerName);
            prayerBar.appendChild(prayerTime);
            prayerTimesDiv.appendChild(prayerBar);
        });
        prayerTimesDiv.innerHTML += "</ul>";
        displayDate();
    }

    // Displays the current date in both Gregorian (Swedish) and Hijri formats
    function displayDate() {
        const today = new Date();

        const gregorianDate = today.toLocaleDateString("sv-SE", { day: 'numeric', month: 'long', year: 'numeric' });
        const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(today);

        dateDiv.innerHTML = `<p>Datum: ${gregorianDate}</p><p>Hijri: ${hijriDate}</p>`;
    }

    // Updates the background color based on the current prayer time period
    function updateBackground(timings, currentTime) {
        const fajrTime = parseTimeToToday(timings.Fajr);
        const sunriseTime = parseTimeToToday(timings.Sunrise);
        const dhuhrTime = parseTimeToToday(timings.Dhuhr);
        const asrTime = parseTimeToToday(timings.Asr);
        const maghribTime = parseTimeToToday(timings.Maghrib);
        const ishaTime = parseTimeToToday(timings.Isha);

        let background;

        // Set background color based on the current time and prayer times
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

    // Start countdown for the next prayer time
    function startCitySpecificCountdown(timings) {
        clearInterval(countdownInterval); // Clear existing countdown

        function updateCountdown() {
            const { nextPrayerName, nextPrayerTime } = getNextPrayerTime();
            updateBackground(timings, new Date()); // Update background based on prayer period

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
                    countdownDiv.innerHTML = `<p>Nästa Bön: ${nextPrayerName} om ${hours}t ${minutes}m ${seconds}s</p>`;
                }
            }, 1000);
        }

        updateCountdown();
    }

    // Set default city to Göteborg on load
    citySelect.value = "Göteborg";
    const defaultCity = "Göteborg";
    updateHeader(defaultCity); // Initialize header with default city
    fetchPrayerTimes(defaultCity);

    // Update prayer times and header when the selected city changes
    citySelect.addEventListener("change", () => {
        const selectedCity = citySelect.value;
        updateHeader(selectedCity);
        fetchPrayerTimes(selectedCity);
    });

    // Start the limited polling process after midnight
    startPollingAfterMidnight(); // Schedule polling to start after 12:16 AM
});