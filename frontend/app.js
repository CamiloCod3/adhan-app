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

    // Helper function to get today's date formatted as "DD-MM-YYYY"
    function getFormattedDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}-${month}-${year}`;
    }
    
    // Mapping of prayer names in Swedish and Arabic
    const prayerNames = [
        { english: "Fajr", swedish: "Fajr", arabic: "الفجر" },
        { english: "Sunrise", swedish: "Soluppgång", arabic: "شروق الشمس" },
        { english: "Dhuhr", swedish: "Dhuhr", arabic: "الظهر" },
        { english: "Asr", swedish: "Asr", arabic: "العصر" },
        { english: "Maghrib", swedish: "Maghrib", arabic: "المغرب" },
        { english: "Isha", swedish: "Isha", arabic: "العشاء" }
    ];

    // Fetch prayer times from DigitalOcean Spaces
    async function fetchPrayerTimes(city) {
        const todayFormatted = getFormattedDate();  // Use today's date
        const response = await fetch(`${SPACES_BASE_URL}/prayer_times_${todayFormatted}.json`);

        if (!response.ok) throw new Error("Failed to fetch prayer times");

        const data = await response.json();
        prayerData = data.data[city];

        displayPrayerTimes(prayerData, city);
        startCitySpecificCountdown(prayerData);
    }

    // Display prayer times for the selected city in both Swedish and Arabic
    function displayPrayerTimes(timings, city) {
        prayerTimesDiv.innerHTML = `<h2>Bönetider för ${city}</h2><ul>`;
        prayerNames.forEach(prayer => {
            const time = timings[prayer.english];
            const prayerBar = document.createElement("div");
            prayerBar.className = "prayer-bar";

            const prayerName = document.createElement("span");
            prayerName.className = "prayer-name";
            prayerName.innerHTML = `${prayer.swedish} (${prayer.arabic})`; // Display Swedish and Arabic

            const prayerTime = document.createElement("span");
            prayerTime.className = "prayer-time";
            prayerTime.innerHTML = `${time} (${convertToArabicNumbers(time)})`; // Western and Arabic time

            prayerBar.appendChild(prayerName);
            prayerBar.appendChild(prayerTime);
            prayerTimesDiv.appendChild(prayerBar);
        });
        prayerTimesDiv.innerHTML += `</ul>`;
        displayDate();
    }

    // Display the current date in both Gregorian and Hijri formats in Swedish
    function displayDate() {
        const today = new Date();
        const gregorianDate = today.toLocaleDateString("sv-SE", { day: 'numeric', month: 'long', year: 'numeric' });
        const hijriDate = new Intl.DateTimeFormat("en-TN-u-ca-islamic", { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
        dateDiv.innerHTML = `<p>Gregoriansk Dato: ${gregorianDate}</p><p>Hijri Dato: ${hijriDate}</p>`;
    }

    // Convert Western numerals to Arabic
    function convertToArabicNumbers(number) {
        const westernToArabic = { "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤", "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩" };
        return number.replace(/\d/g, digit => westernToArabic[digit]);
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
                nextPrayerName = "Fajr (Nästa Dag)";
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
                    countdownDiv.innerHTML = `<p>Nästa Bön: ${nextPrayerName} om ${hours}t ${minutes}m ${seconds}s</p>`;
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