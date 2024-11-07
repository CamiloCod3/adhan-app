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
    const header = document.querySelector("h1");

    let countdownInterval;
    let prayerData;
    let lastUpdateDate = null;

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
    
            // Always update prayer times for the selected city, even if the date hasn't changed
            lastUpdateDate = currentDate;
            prayerData = data.data; // Update with the latest prayer data for all cities
            displayPrayerTimes(prayerData[city], city); // Display prayer times for selected city
            startCitySpecificCountdown(prayerData[city]); // Start countdown based on selected city
        } catch (error) {
            console.error("Error fetching prayer times:", error);
            prayerTimesDiv.innerHTML = `<p style="color:red;">Failed to load prayer times. Please try again later.</p>`;
        }
    }

    // Update header based on selected city
    function updateHeader(city) {
        header.textContent = `Bönetider: ${city}`;
    }

    // Polling function that limits checks to 3 times with a 15-minute interval after 12:16 AM
    function startLimitedPolling() {
        const maxAttempts = 3;
        const pollingInterval = 15 * 60 * 1000;
        let attempts = 0;

        const pollInterval = setInterval(() => {
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                return;
            }
            fetchPrayerTimes(citySelect.value);
            attempts += 1;
        }, pollingInterval);
    }

    // Schedules polling to start at 12:16 AM each day
    function startPollingAfterMidnight() {
        const now = new Date();
        const targetTime = new Date(now);
        targetTime.setHours(0, 0, 0, 0); // Set to midnight
    
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
    
        const timeUntilTarget = targetTime - now;
        setTimeout(() => {
            displayDate(); // Reset Hijri date display to default at midnight
            startLimitedPolling(); // Begin limited polling for new data
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
            prayerName.innerHTML = `${prayer.swedish} (${prayer.arabic})`;

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

    const baselineHijriDate = { day: 5, month: "Jumada I", year: 1446 };
    const baselineGregorianDate = new Date("2024-11-07");
    
    // Function to calculate Hijri date based on baseline and adjustment
    function calculateHijriDateFromBaseline(hijriAdjustment = 0) {
        const today = new Date();
        const daysSinceBaseline = Math.floor((today - baselineGregorianDate) / (1000 * 60 * 60 * 24)) + hijriAdjustment;
    
        const hijriDate = new Date(baselineGregorianDate);
        hijriDate.setDate(hijriDate.getDate() + daysSinceBaseline);
    
        const hijriDateObj = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
            day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn'
        }).formatToParts(hijriDate);
    
        const hijriDay = parseInt(hijriDateObj.find(part => part.type === "day").value);
        const hijriMonth = hijriDateObj.find(part => part.type === "month").value;
        const hijriYear = hijriDateObj.find(part => part.type === "year").value;
    
        return { day: hijriDay, month: hijriMonth, year: hijriYear };
    }

    // Function to display both Gregorian and Hijri dates, with optional adjustment
    function displayDate(hijriAdjustment = 0) {
        const today = new Date();
        const gregorianDate = today.toLocaleDateString("sv-SE", { day: 'numeric', month: 'long', year: 'numeric' });
    
        const hijriDate = calculateHijriDateFromBaseline(hijriAdjustment);
    
        dateDiv.innerHTML = `<p>Datum: ${gregorianDate}</p><p>Hijri: ${hijriDate.day} ${hijriDate.month} ${hijriDate.year} هـ</p>`;
    }

    function updateHijriDateAfterMaghrib() {
        displayDate(1);
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

    // Countdown for the next prayer time
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
                nextPrayerName = "Fajr (Nästa Dag)";
                nextPrayerTime = fajrTime;
            }

            if (now >= parseTimeToToday(timings["Maghrib"])) {
                updateHijriDateAfterMaghrib();
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
                    countdownDiv.innerHTML = `<p>Nästa Bön: ${nextPrayerName} om ${hours}t ${minutes}m ${seconds}s</p>`;
                }
            }, 1000);
        }

        updateCountdown();
    }

    // Set default city and initialize
    citySelect.value = "Göteborg";
    const defaultCity = "Göteborg";
    updateHeader(defaultCity);
    fetchPrayerTimes(defaultCity);

    // Update prayer times and header when the selected city changes
    citySelect.addEventListener("change", () => {
        const selectedCity = citySelect.value;
        updateHeader(selectedCity);
        fetchPrayerTimes(selectedCity); // Fetch new prayer times for the selected city
    });

    startPollingAfterMidnight();
});