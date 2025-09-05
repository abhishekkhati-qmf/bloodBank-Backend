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
  origin: "http://localhost:5173",   
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/test',require('./routes/testRroute.js'))
app.use('/api/v1/auth',require('./routes/authRoute.js'))
app.use('/api/v1/inventory',require('./routes/inventoryRoutes.js'))
app.use('/api/v1/analytics',require('./routes/analyticsRoutes.js'))
app.use("/api/v1/admin", require("./routes/adminRoutes.js"));
app.use('/api/v1/requests', require('./routes/requestRoutes.js'));
app.use('/api/v1/donor-requests', require('./routes/donorRequestRoutes.js'));
app.use('/api/v1/camps', require('./routes/campRoutes.js'));
app.use('/api/v1/emergency', require('./routes/emergencyRequestRoutes.js'));
app.use('/api/v1/donation-requests', require('./routes/donationRequestRoutes.js'));


const PORT = process.env.PORT || 8080;

app.listen(PORT, ()=> console.log(`Server running in ${process.env.DEV_MODE} on ${process.env.PORT}`.bgBlue.white ));