require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "coupons";
const couponsCollectionName = "coupons";
const claimsCollectionName = "claims";

const connectDB = async () => {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected");

        const db = client.db(dbName);
        app.locals.couponsCollection = db.collection(couponsCollectionName);
        app.locals.claimsCollection = db.collection(claimsCollectionName);
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};
connectDB();

// Insert Coupons (Run once)
const insertCoupons = async () => {
    try {
        const coupons = [
            { code: "COUPON2023", used: false },
            { code: "SUMMER2023", used: false },
            { code: "WINTER2023", used: false },
            { code: "SPRING2023", used: false },
            { code: "OFFER2023", used: false },
            { code: "FALL2023", used: false },
            { code: "DISCOUNT2023", used: false },
            { code: "DEAL2023", used: false },
            { code: "PROMO2023", used: false },
            { code: "BLACKFRIDAY2023", used: false },
            { code: "CYBERMONDAY2023", used: false },
            { code: "NEWYEAR2023", used: false },
            { code: "MEMORIAL2023", used: false },
            { code: "EASTER2023", used: false },
            { code: "LABORDAY2023", used: false },
            { code: "THANKSGIVING2023", used: false },
            { code: "CHRISTMAS2023", used: false },
            { code: "GIFT2023", used: false },
            { code: "SAVINGS2023", used: false },
            { code: "BUNDLE2023", used: false },
            { code: "GREATDEAL2023", used: false },
            { code: "EXCLUSIVE2023", used: false },
            { code: "VIP2023", used: false },
            { code: "WELCOME2023", used: false },
            { code: "VIPDEAL2023", used: false },
            { code: "BIGSALE2023", used: false },
            { code: "FLASHSALE2023", used: false },
            { code: "SUMMERDEAL2023", used: false },
            { code: "WINTERDEAL2023", used: false },
            { code: "FREESHIP2023", used: false },
            { code: "EXTRA2023", used: false },
            { code: "DISCOUNT10", used: false },
            { code: "DISCOUNT20", used: false },
            { code: "FREESHIP10", used: false },
            { code: "SALE20", used: false },
            { code: "COUPON10", used: false },
            { code: "COUPON15", used: false },
            { code: "COUPON25", used: false },
            { code: "SUMMERBLOWOUT2023", used: false },
            { code: "SPRINGSALE2023", used: false },
            { code: "WINTERCLEARANCE2023", used: false },
            { code: "VIPSALE2023", used: false },
            { code: "SUMMERFLASH2023", used: false },
            { code: "WINTERPROMO2023", used: false },
            { code: "EXTRADEAL2023", used: false },
            { code: "BOSSSALE2023", used: false },
            { code: "BLACKDEAL2023", used: false },
            { code: "HOTDEAL2023", used: false },
            { code: "COOLDEAL2023", used: false },
            { code: "SUPERSALE2023", used: false },
            { code: "EARLYBIRD2023", used: false },
            { code: "FINALSALE2023", used: false },
            { code: "THANKYOU2023", used: false },
            { code: "FLASHDEAL2023", used: false }
        ];
        const couponsCollection = app.locals.couponsCollection;
        await couponsCollection.insertMany(coupons);
        console.log("✅ Coupons Inserted!");
    } catch (error) {
        console.error("❌ Error inserting coupons:", error.message);
    }
};
// insertCoupons(); // Uncomment & run ONCE to add coupons

// Check if the user has already claimed a coupon
app.get("/check-claim", async (req, res) => {
    try {
        const ip = req.ip;
        const cookieId = req.cookies?.userToken;

        if (!cookieId) {
            return res.json({ isClaimed: false });
        }

        const claimsCollection = app.locals.claimsCollection;

        const userClaims = await claimsCollection.find({ $or: [{ ip }, { cookieId }] }).toArray();
        if (userClaims.length > 0) {
            return res.json({ 
                isClaimed: true, 
                coupon: userClaims[0].coupon,
                timestamp: userClaims[0].timestamp // Return timestamp of the last claim
            });
        }

        return res.json({ isClaimed: false });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});


// Claim a coupon
app.post("/claim", async (req, res) => {
    try {
        const ip = req.ip;
        const cookieId = req.cookies?.userToken || Math.random().toString(36).substring(2);
        const maxClaimsPerUser = 1;
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        const claimsCollection = app.locals.claimsCollection;

        const userClaims = await claimsCollection.find({ $or: [{ ip }, { cookieId }] }).toArray();
        if (userClaims.length > 0) {
            const lastClaimTimestamp = new Date(userClaims[userClaims.length - 1].timestamp);
            const timeDiff = new Date() - lastClaimTimestamp;

            if (timeDiff < oneHour) {
                return res.status(403).json({ message: "You must wait 1 hour before claiming another coupon." });
            }
        }

        const couponsCollection = app.locals.couponsCollection;
        const coupon = await couponsCollection.findOne({ used: false });
        if (!coupon) return res.status(404).json({ message: "No Coupons Available" });

        await couponsCollection.updateOne({ _id: coupon._id }, { $set: { used: true } });

        await claimsCollection.insertOne({ ip, cookieId, coupon: coupon.code, timestamp: new Date() });

        res.cookie("userToken", cookieId, { httpOnly: true, maxAge: 60 * 60 * 1000 });

        res.json({ message: `Coupon ${coupon.code} claimed successfully!`, coupon: coupon.code });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
