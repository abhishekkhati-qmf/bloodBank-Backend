const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db.js');
const seedAdmin = require('./config/adminSeeder.js');

dotenv.config();

//mongodb connection
connectDB();

// Seed admin user from environment variables
seedAdmin();

const app = express();

//middlewares
const corsOptions = {
  origin: "https://blood-bank-frontend-omega.vercel.app",   
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth',require('./routes/authRoute.js'))
app.use('/api/inventory',require('./routes/inventoryRoutes.js'))
app.use('/api/analytics',require('./routes/analyticsRoutes.js'))
app.use("/api/admin", require("./routes/adminRoutes.js"));
app.use('/api/requests', require('./routes/requestRoutes.js'));
app.use('/api/donor-requests', require('./routes/donorRequestRoutes.js'));
app.use('/api/camps', require('./routes/campRoutes.js'));
app.use('/api/emergency', require('./routes/emergencyRequestRoutes.js'));
app.use('/api/donation-requests', require('./routes/donationRequestRoutes.js'));


const PORT = process.env.PORT || 8080;

app.listen(PORT, ()=> console.log(`Server running in ${process.env.DEV_MODE} on ${process.env.PORT}`.bgBlue.white ));