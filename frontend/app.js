document.addEventListener("DOMContentLoaded", () => {
    // Select DOM elements for prayer times, city selection, countdown, and date display
    const citySelect = document.getElementById("city-select");
    const prayerTimesDiv = document.getElementById("prayer-times");
    const countdownDiv = document.getElementById("countdown");
    const dateDiv = document.getElementById("date");
    const header = document.querySelector("h1"); // Select the header element for dynamic updates

    let countdownInterval;
    let prayerData; // Holds prayer times data for the selected city

    // Helper function to parse a time string (e.g., "04:58") into a Date object for today
    function parseTimeToToday(timeStr) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        return today;
    }

    // Base URL for accessing the DigitalOcean Spaces storage
    const SPACES_BASE_URL = 'https://adhan-data.nyc3.cdn.digitaloceanspaces.com';

    // Get today's date formatted as "DD-MM-YYYY" for use in fetching the daily JSON file
    function getFormattedDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // List of prayer names in English, Swedish, and Arabic for display purposes
    const prayerNames = [
        { english: "Fajr", swedish: "Fajr", arabic: "الفجر" },
        { english: "Sunrise", swedish: "Shuruk ☀️", arabic: "شروق الشمس" }, // Mapping "Sunrise" to "Shuruk" with an emoji
        { english: "Dhuhr", swedish: "Dhuhr", arabic: "الظهر" },
        { english: "Asr", swedish: "Asr", arabic: "العصر" },
        { english: "Maghrib", swedish: "Maghrib", arabic: "المغرب" },
        { english: "Isha", swedish: "Isha", arabic: "العشاء" }
    ];

    // Function to update header based on selected city
    function updateHeader(city) {
        header.textContent = `Bönetider: ${city}`;
    }

    // Fetches prayer times from the JSON file in the DigitalOcean Space for the specified city
    async function fetchPrayerTimes(city) {
        const todayFormatted = getFormattedDate();
    
        try {
            const response = await fetch(`${SPACES_BASE_URL}/prayer_times_${todayFormatted}.json`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            });
    
            if (!response.ok) throw new Error(`Failed to fetch prayer times: ${response.statusText}`);
    
            const data = await response.json();
            prayerData = data.data[city];
            updateHeader(city);
            displayPrayerTimes(prayerData, city);
            startCitySpecificCountdown(prayerData);
        } catch (error) {
            console.error("Error fetching prayer times:", error);
            prayerTimesDiv.innerHTML = `<p style="color:red;">Failed to load prayer times. Please try again later.</p>`;
        }
    }

    // Display prayer times for the selected city
    function displayPrayerTimes(timings, city) {
        prayerTimesDiv.innerHTML = "<ul>";
        prayerNames.forEach(prayer => {
            // Use the English name to get the correct timing from `timings`
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
        displayDate(); // Display the current date in Swedish and Hijri formats
    }

    // Displays the current date in both Gregorian (Swedish) and Hijri formats
    function displayDate() {
        const today = new Date();

        // Format Gregorian date in Swedish locale
        const gregorianDate = today.toLocaleDateString("sv-SE", { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        // Format Hijri date, ensuring it doesn't default to "May" or "BC"
        const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric', 
            numberingSystem: 'latn'  // Use Latin numerals for consistency
        }).format(today);

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

    // Initiates countdown to the next prayer time and updates the background dynamically
    function startCitySpecificCountdown(timings) {
        clearInterval(countdownInterval); // Clear any existing countdown intervals

        // Determine the next prayer time based on current time
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

            // If no next prayer time is found, set Fajr of the next day as the next prayer
            if (!nextPrayerTime) {
                const fajrTime = parseTimeToToday(timings["Fajr"]);
                fajrTime.setDate(fajrTime.getDate() + 1);
                nextPrayerName = "Fajr (Nästa Dag)";
                nextPrayerTime = fajrTime;
            }

            return { nextPrayerName, nextPrayerTime };
        }

        // Updates the countdown timer every second
        function updateCountdown() {
            const { nextPrayerName, nextPrayerTime } = getNextPrayerTime();
            updateBackground(timings, new Date()); // Update background based on prayer period

            countdownInterval = setInterval(() => {
                const now = new Date();
                const timeRemaining = nextPrayerTime - now;

                // If the prayer time is reached, fetch the prayer times again to reset the countdown
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
});