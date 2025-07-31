const passwordInput = document.getElementById("YourPassword");
  const strengthBar = document.getElementById("strengthBar");
  const strengthText = document.getElementById("strengthText");
  const suggestionText = document.getElementById("suggestionText");
  const scoreText = document.getElementById("scoreText");
  const timeToCrackText = document.getElementById("timeToCrack");
  const historyWarning = document.getElementById("historyWarning");
  const eyeBtn = document.getElementById("eyeBtn");

  const optUpper = document.getElementById("optUpper");
  const optLower = document.getElementById("optLower");
  const optNumber = document.getElementById("optNumber");
  const optSpecial = document.getElementById("optSpecial");
  const optLength = document.getElementById("optLength");

  let isVisible = true;
  const passwordHistoryKey = "passwordHistory_v2";
  const maxHistory = 5;

  // --- Password history functions ---
  function getPasswordHistory() {
    const history = localStorage.getItem(passwordHistoryKey);
    return history ? JSON.parse(history) : [];
  }

  function addPasswordToHistory(password) {
    if (!password) return;
    let history = getPasswordHistory();
    if (history.includes(password)) return; // already in history
    history.unshift(password);
    if (history.length > maxHistory) history = history.slice(0, maxHistory);
    localStorage.setItem(passwordHistoryKey, JSON.stringify(history));
  }

  function checkPasswordReuse(password) {
  if (!password) return false;
  const history = JSON.parse(localStorage.getItem(passwordHistoryKey) || "[]"); // use passwordHistoryKey
  if (history.length === 0) return false;
  return history.includes(password);
}


  // --- SHA1 hash for breach check ---
  async function sha1(str) {
    const buffer = new TextEncoder("utf-8").encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    return hashHex;
  }

  // --- Check breach using HaveIBeenPwned API ---
  async function checkBreach() {
  const password = passwordInput.value;
  if (!password) {
    alert("Please enter a password to check.");
    return;
  }
  suggestionText.textContent = "";
  historyWarning.textContent = "";
  strengthText.textContent = "Checking breach...";
  strengthBar.style.width = "0%";
  // Clear other texts if present
  timeToCrackText.textContent = "";

  try {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    console.log("SHA1 hash:", hash);
    console.log("Prefix:", prefix, "Suffix:", suffix);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) throw new Error("Failed to fetch breach data: " + response.status);

    const text = await response.text();
    // console.log("Response text:", text);

    const lines = text.split("\n");
    // Find suffix match (case-insensitive)
    const foundLine = lines.find(line => line.toUpperCase().startsWith(suffix));

    if (foundLine) {
      const count = parseInt(foundLine.split(":")[1]);
      strengthText.textContent = `Password breached ${count.toLocaleString()} times! 🚨`;
      strengthBar.style.width = "100%";
      strengthBar.style.background = "#ff3b3b";
    } else {
      strengthText.textContent = "Password NOT found in breaches. ✅";
      updateStrengthDisplay(password);
    }
  } catch (error) {
    strengthText.textContent = "Error checking breach.";
    console.error("Breach check error:", error);
  }
}


  // --- Toggle password visibility ---
  function toggleVisibility() {
    isVisible = !isVisible;
    passwordInput.type = isVisible ? "text" : "password";
    eyeBtn.textContent = isVisible ? "🙈" : "🐵";
  }

  // --- Copy password to clipboard ---
  function copyPassword() {
    if (!passwordInput.value) return;
    navigator.clipboard.writeText(passwordInput.value).then(() => {
      alert("Password copied to clipboard!");
    });
  }

  // --- Password strength evaluation ---
  function evaluatePassword(password) {
  let strength = 0;
  const suggestions = [];

  // Length contribution: minimum 8 chars, max impact capped at length 20
  if (password.length >= 8) {
    // For every 2 chars above 8, add 1 point, max 6 points for length
    const lengthPoints = Math.min(6, Math.floor((password.length - 8) / 2) + 1);
    strength += lengthPoints;
  } else {
    suggestions.push("Use at least 8 characters.");
  }

  // Character variety points
  if (/[A-Z]/.test(password)) strength += 2;  // uppercase worth 2 points
  else suggestions.push("Add uppercase letters.");

  if (/[a-z]/.test(password)) strength += 2;  // lowercase worth 2 points
  else suggestions.push("Add lowercase letters.");

  if (/\d/.test(password)) strength += 2;     // digits worth 2 points
  else suggestions.push("Include numbers.");

  if (/[@$!%*#?&^_-]/.test(password)) strength += 3;  // special chars worth 3 points
  else suggestions.push("Use special characters.");

  // Normalize max score ~15 points
  return { strength, suggestions };
}


  function updateStrengthDisplay(password) {
    if (!password) {
      strengthBar.style.width = "0%";
      strengthBar.style.background = "red";
      strengthText.textContent = "Enter a password";
      suggestionText.textContent = "";
      scoreText.textContent = "";
      timeToCrackText.textContent = "";
      historyWarning.textContent = "";
      return;
    }
    const { strength, suggestions } = evaluatePassword(password);

    const maxScore = 5 + 5; // length max 5 + 4 criteria + 1 special char? Here total max ~9 or 10
    const scorePercent = Math.min(100, (strength / 10) * 100);

    // Color scale: red (weak) to green (strong)
    let color = "red";
    if (strength >= 8) color = "#00b894"; // green
    else if (strength >= 5) color = "#f1c40f"; // yellow

    strengthBar.style.width = scorePercent + "%";
    strengthBar.style.background = color;

    const levels = [
      "Very Weak 😞",
      "Weak 😕",
      "Fair 😐",
      "Good 🙂",
      "Strong 😃",
      "Very Strong 💪"
    ];

    let index = Math.min(levels.length - 1, Math.floor((strength / 10) * levels.length));

    strengthText.textContent = levels[index];


    if (suggestions.length) suggestionText.textContent = "Suggestions: " + suggestions.join(" ");
    else suggestionText.textContent = "Great password!";

    // Time to crack
    timeToCrackText.textContent = "Estimated time to crack: " + estimateTimeToCrack(password);

    // Password reuse warning
    function checkPasswordReuse(password) {
  if (!password) return false;  // empty password not reused
  const history = JSON.parse(localStorage.getItem("passwordHistory") || "[]");
  if (history.length === 0) return false; // no history means no reuse
  return history.includes(password);
}

  }

  // --- Estimate time to crack (rough entropy-based) ---
  function estimateTimeToCrack(password) {
    if (!password) return "";

    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[@$!%*#?&^_-]/.test(password)) charsetSize += 14;

    // entropy = length * log2(charset)
    const entropyBits = password.length * Math.log2(charsetSize || 1);

    // guesses per second (offline fast GPU)
    const guessesPerSecond = 1e10;

    // seconds = 2^entropy / guessesPerSecond
    const seconds = Math.pow(2, entropyBits) / guessesPerSecond;

    return formatSeconds(seconds);
  }

  function formatSeconds(seconds) {
    if (seconds === 0 || !isFinite(seconds)) return "Instantly cracked";
    if (seconds < 1) return "< 1 second";

    const intervals = [
      { label: "year", seconds: 31536000 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 }
    ];

    for (const interval of intervals) {
      if (seconds >= interval.seconds) {
        const value = Math.floor(seconds / interval.seconds);
        return `${value} ${interval.label}${value !== 1 ? "s" : ""}`;
      }
    }
    return "Less than a second";
  }

  function generatePassword() {
    const length = parseInt(optLength.value) || 12;

    // Build charset from selected options
    let charset = "";
    if (optUpper.checked) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (optLower.checked) charset += "abcdefghijklmnopqrstuvwxyz";
    if (optNumber.checked) charset += "0123456789";
    if (optSpecial.checked) charset += "@$!%*#?&^_-";

    if (!charset.length) {
      alert("Please select at least one character type.");
      return;
    }

    let password = "";
    // Ensure at least one character from each selected set (to satisfy requirements)
    const mustInclude = [];
    if (optUpper.checked) mustInclude.push(randomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
    if (optLower.checked) mustInclude.push(randomChar("abcdefghijklmnopqrstuvwxyz"));
    if (optNumber.checked) mustInclude.push(randomChar("0123456789"));
    if (optSpecial.checked) mustInclude.push(randomChar("@$!%*#?&^_-"));

    // Fill the rest randomly
    for (let i = 0; i < length - mustInclude.length; i++) {
      password += randomChar(charset);
    }

    // Mix mustInclude chars into password at random positions
    password = password.split('');
    mustInclude.forEach(ch => {
      const pos = Math.floor(Math.random() * password.length);
      password.splice(pos, 0, ch);
    });

    password = password.join('');

    passwordInput.value = password;
    updateStrengthDisplay(password);
    addPasswordToHistory(password);
  }

  function randomChar(str) {
    return str.charAt(Math.floor(Math.random() * str.length));
  }

  // --- Event listeners ---
  passwordInput.addEventListener("input", () => {
  const pw = passwordInput.value;
  updateStrengthDisplay(pw);
  // Do NOT add typed passwords to history here to avoid false reuse warnings
});

  // Update strength on options change
  [optUpper, optLower, optNumber, optSpecial, optLength].forEach(opt => {
    opt.addEventListener("change", () => {
      updateStrengthDisplay(passwordInput.value);
    });
  });

  // Initial update
  updateStrengthDisplay(passwordInput.value);


