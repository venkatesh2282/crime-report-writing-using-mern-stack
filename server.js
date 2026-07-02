const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Admin credentials (demo only)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_TOKEN = "supersecrettoken";

app.use(cors());
app.use(express.json());

const DATA_FILE = "crimes.json";

// ---------- DATA PERSISTENCE HELPERS ----------
let crimes = [];
let nextId = 1;

// Load crimes from JSON on start
function loadCrimes() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    crimes = JSON.parse(data);
    nextId = crimes.length ? Math.max(...crimes.map((c) => c.id)) + 1 : 1;
  } catch (err) {
    crimes = [];
    nextId = 1;
  }
}

// Save crimes to JSON file
function saveCrimes() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(crimes, null, 2));
}

loadCrimes();

// ---------- CITY LIST: AP + TELANGANA ----------
const cities = [
  // Andhra Pradesh
  "Amaravati",
  "Visakhapatnam",
  "Vijayawada",
  "Guntur",
  "Nellore",
  "Kurnool",
  "Tirupati",
  "Kadapa",
  "Anantapur",
  "Rajahmundry",
  "Kakinada",
  "Ongole",
  "Eluru",
  "Srikakulam",
  "Vizianagaram",
  "Chittoor",

  // Telangana
  "Hyderabad",
  "Warangal",
  "Nizamabad",
  "Karimnagar",
  "Khammam",
  "Nalgonda",
  "Mahbubnagar",
  "Adilabad",
  "Siddipet",
  "Sangareddy",
  "Ramagundam",
  "Jagtial"
];

// ---------- ROUTES ----------

// Public – get list of cities
app.get("/api/cities", (req, res) => {
  res.json(cities);
});

// Public – get crimes (optionally filter by city)
app.get("/api/crimes", (req, res) => {
  const { city } = req.query;

  let result = crimes;
  if (city) {
    result = crimes.filter((c) => c.city === city);
  }

  // newest updated first
  result.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt)
  );

  res.json(result);
});

// Public – create a new crime report
app.post("/api/crimes", (req, res) => {
  const { city, victimName, crimeType, date, complaint } = req.body;

  if (!city || !victimName || !crimeType || !date || !complaint) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const now = new Date().toISOString();

  const newCrime = {
    id: nextId++,
    city,
    victimName,
    crimeType,
    date,
    complaint,
    createdAt: now,
    updatedAt: now
  };

  crimes.push(newCrime);
  saveCrimes(); // persist to JSON

  res.status(201).json(newCrime);
});

// Admin – login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_TOKEN });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

// Admin auth middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Admin – update a crime report
app.put("/api/crimes/:id", authenticateAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = crimes.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Crime not found" });
  }

  const { city, victimName, crimeType, date, complaint } = req.body;

  if (city !== undefined) crimes[index].city = city;
  if (victimName !== undefined) crimes[index].victimName = victimName;
  if (crimeType !== undefined) crimes[index].crimeType = crimeType;
  if (date !== undefined) crimes[index].date = date;
  if (complaint !== undefined) crimes[index].complaint = complaint;

  crimes[index].updatedAt = new Date().toISOString();

  saveCrimes(); // persist edit

  res.json(crimes[index]);
});

// Admin – delete a crime report
app.delete("/api/crimes/:id", authenticateAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = crimes.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Crime not found" });
  }

  const removed = crimes.splice(index, 1)[0];
  saveCrimes(); // persist delete

  res.json({ message: "Crime deleted", crime: removed });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Admin login -> username: admin, password: admin123");
});
