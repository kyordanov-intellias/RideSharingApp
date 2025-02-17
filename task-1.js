class RideSharingApp {
    constructor() {
        if (RideSharingApp.instance) {
            return RideSharingApp.instance;
        };
        this.users = [];
        this.drivers = [];
        this.rides = [];
        //singletonn patter (ensures that only one instance of the app exist)
        RideSharingApp.instance = this;
    };

    addUser(user) {
        this.users.push(user);
    };

    addDriver(driver) {
        this.drivers.push(driver);
    };

    addRide(ride) {
        this.rides.push(ride);
    };

    // Generator functon
    *getActiveRides() {
        for (let ride of this.rides) {
            if (ride.status === 'active') {
                yield ride;
            };
        };
    };

    getAvailableDrivers() {
        return this.drivers.filter(driver => driver.available);
    };
};

class User {
    #paymentDetails;
    constructor(name, paymentDetails) {
        this.name = name;
        this.#paymentDetails = paymentDetails;
        this.ratings = [];
    };

    update(ride) {
        let icon;
        switch (ride.status) {
            case 'completed':
                icon = '🤟🏻';
                break;
            case 'pending':
                icon = '🕙';
                break;
            case 'active':
                icon = '🚖🔜';
                break;
            default:
                icon = ''
                break;
        };
        console.log(`User Notification 📩 => ${this.name} received a ride update: Status is now "${ride.status}" ${icon}`);
    };

    requestRide(pickupLocation, dropoffLocation, driver = null) {
        const ride = new Ride(this, pickupLocation, dropoffLocation);
        if (driver) {
            ride.subscribeToObserver(this);
            ride.subscribeToObserver(driver);
        };
        return ride;
    };

    async requestRideWithAutoMatch(pickupLocation) {
        try {
            await matchRide(this, pickupLocation);
        } catch (error) {
            console.error(`Failed to find a ride for ${this.name}: ${error.message}`);
        };
    };

    giveTip(ride, amount) {
        if (amount >= 0) {
            ride.tip = amount;
            console.log(`${this.name} gave a tip of $${amount.toFixed(2)} for this ride.`);
            ride.notifyObservers();
        } else {
            console.log("Invalid tip amount.");
        };
    };

    rateDriver(score, feedback) {
        const rating = new Rating(score, feedback);
        this.ratings.push(rating.submit());
        console.log(`${this.name} rated a driver with a score of ${score}/5`);
    };
};

class Driver {
    constructor(name, carDetails) {
        this.name = name;
        this.carDetails = carDetails;
        this.available = true;
        this.ratings = [];
        this.location = { lat: 0, lng: 0 };
    };

    update(ride) {
        let icon;
        switch (ride.status) {
            case 'completed':
                icon = '🙈';
                break;
            case 'pending':
                icon = '🕙';
                break;
            case 'active':
                icon = '🚖';
                break;
            default:
                icon = ''
                break;
        };
        console.log(`Driver Notification 📩 => ${this.name} received a ride update: Status is now "${ride.status}" ${icon}`);
    };

    acceptRide(ride) {
        if (this.available) {
            ride.assignDriver(this);
            this.available = false;
        } else {
            console.log(`${this.name} is already on a ride!`);
        };
    };

    rateUser(score, feedback) {
        const rating = new Rating(score, feedback);
        this.ratings.push(rating.submit());
        console.log(`${this.name} rated a user with a score of ${score}/5`);
    };

    showAverageRatinh() {
        if (this.ratings.length > 0) {
            let total = 0;
            for (const rating of this.ratings) {
                total += rating.score;
            };
            const avg = total / this.ratings.length;
            console.log(`Average rating of ${this.name} is ${avg.toFixed(2)}`);
        } else {
            console.log(`The driven doesn't have score yet!`);
        };
    };
    updateLocation(lat, lng) {
        this.location = { lat, lng };
    };
};


class Ride {
    constructor(user, pickupLocation, dropoffLocation) {
        this.user = user;
        this.pickupLocation = pickupLocation;
        this.dropoffLocation = dropoffLocation;
        this.status = 'pending';
        this.fare = this.calculateFare();
        this.driver = null;
        this.observers = [];
        this.tip = 0;
        this.detailedStatus = 'searching_driver';
        this.startTime = null;
        this.endTime = null;
    };

    calculateFare() {
        return Math.random() * 50 + 10;
    };

    assignDriver(driver) {
        this.driver = driver;
        this.status = 'active';
        this.notifyObservers();
    };

    completeRide() {
        this.endTime = new Date();
        this.updateStatus('completed');
        if (this.driver) {
            this.driver.available = true;
        };
        this.observers.forEach(observer => this.unsubscribeFromObserver(observer));
    };

    subscribeToObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
            observer.update(this);
        };
    };

    unsubscribeFromObserver(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    };

    notifyObservers() {
        const uniqueObservers = [...new Set(this.observers)]; // Remove duplicates
        for (const observer of uniqueObservers) {
            observer.update(this);
        }
    };

    updateStatus(newStatus, details = '') {
        if (this.status === newStatus) return;

        this.detailedStatus = newStatus;
        this.status = newStatus;
        const notification = {
            searching_driver: '🔍 Searching for nearby drivers...',
            driver_assigned: '✅ Driver assigned and en route',
            arriving_soon: '🚗 Driver arriving in 2 minutes',
            arrived: '📍 Driver has arrived at pickup location',
            in_progress: '🚖 Ride in progress',
            completed: '🏁 Ride completed',
            cancelled: '❌ Ride cancelled'
        }[newStatus];

        console.log(`${notification} ${details}`);
        this.notifyObservers();
    };

    startRide() {
        this.startTime = new Date();
        this.updateStatus('in progress...');
    };
};

class PremiumUser extends User {
    constructor(name, paymentDetails, premiumBenefits) {
        super(name, paymentDetails);
        this.premiumBenefits = premiumBenefits;
    };
    //TODO - Add 20% discont
    requestPremiumRide(pickupLocation, dropoffLocation) {
        const ride = super.requestRide(pickupLocation, dropoffLocation);
        const newFare = ride.fare * 0.8;
        console.log(`Fare for Premium User ${this.name} is $${newFare.toFixed(2)} from $${ride.fare.toFixed(2)}`);
        ride.fare = newFare;
        return ride;
    };
};

class VIPDriver extends Driver {
    constructor(name, carDetails, vipStatus) {
        super(name, carDetails);
        this.vipStatus = vipStatus;
        this.minimumRating = 4.5;
    };

    acceptRide(ride) {
        if (!this.vipStatus) {
            console.log(`${this.name} is not currently available for VIP rides`);
            return;
        };

        const userRating = this.calculateUserRating(ride.user);
        if (userRating < this.minimumRating) {
            console.log(`${this.name} only accepts rides from highly-rated users`);
            return;
        };

        super.acceptRide(ride);
        console.log(`VIP driver ${this.name} assigned to ${ride.user.name}`);
    };

    calculateUserRating(user) {
        if (!user.ratings.length) return 5;
        return user.ratings.reduce((sum, rating) => sum + rating.score, 0) / user.ratings.length;
    };
};

class Rating {
    constructor(score, feedback) {
        this.score = score;
        this.feedback = feedback || '';
        this.timestamp = Date.now();
    };

    submit() {
        if (this.score < 1 || this.score > 5) {
            throw new Error("Rating score must be between 1 and 5.");
        };
        console.log(`Rating submitted: ${this.score}/5. Feedback: ${this.feedback}`);
        return this;
    };
};

class RideNotificationFactory {
    static createNotification(ride) {
        if (ride.status === 'active') {
            return new ActiveRideNotification(ride);
        } else if (ride.status === 'completed') {
            return new CompletedRideNotification(ride);
        };
        return new PendingRideNotification(ride);
    };
};

class RideNotification {
    constructor(ride) {
        this.ride = ride;
    };
};

class ActiveRideNotification extends RideNotification {
    send() {
        console.log(`Active ride notification for ${this.ride.user.name}`);
    };
};

class CompletedRideNotification extends RideNotification {
    send() {
        console.log(`Ride completed notification for ${this.ride.user.name} by ${this.ride.driver.name} with ${this.ride.driver.carDetails}. Fare: $${this.ride.fare.toFixed(2)}`);
        if (this.ride.tip > 0) {
            console.log(`Tip for rider: $${this.ride.tip.toFixed(2)}`);
        } else {
            console.log(`${this.ride.user.name} didn't tip ${this.ride.driver.name} for the ride! :(`);
        };
    };
};

class PendingRideNotification extends RideNotification {
    send() {
        console.log(`Pending ride notification for ${this.ride.user.name}`);
    };
};

async function findNearestDriver(userLocation, availableDrivers) {
    return availableDrivers.reduce((nearest, driver) => {
        const distance = Math.sqrt(
            Math.pow(userLocation.lat - driver.location.lat, 2) +
            Math.pow(userLocation.lng - driver.location.lng, 2)
        );
        return !nearest || distance < nearest.distance
            ? { driver, distance }
            : nearest;
    }, null)?.driver;
};

async function matchRide(user, pickupLocation) {
    try {
        const availableDrivers = await getAvailableDrivers();
        if (availableDrivers.length === 0) {
            throw new Error('No available drivers at the moment');
        };

        const nearestDriver = await findNearestDriver(pickupLocation, availableDrivers);
        if (!nearestDriver) {
            throw new Error('No nearby drivers found');
        };

        const ride = user.requestRide(pickupLocation, "Destination", nearestDriver);

        setTimeout(() => {
            nearestDriver.acceptRide(ride);
            const notification = RideNotificationFactory.createNotification(ride);
            notification.send();
        }, 1000);

    } catch (error) {
        console.error('Error matching ride:', error.message);
    };
};

async function getAvailableDrivers() {
    const app = RideSharingApp.instance;
    if (!app) {
        throw new Error('RideSharingApp instance not found');
    };
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(app.getAvailableDrivers());
        }, 1000);
    });
};

async function processPayment(user, ride, tipAmount = 0) {
    try {
        console.log(`🔄 Processing payment for ride from ${ride.pickupLocation} to ${ride.dropoffLocation} [${user.name}] 🔄`);

        const paymentSuccess = await simulatePaymentProcessing();

        if (paymentSuccess) {
            console.log('✅ Payment successful! ✅');
            ride.completeRide();
            user.giveTip(ride, tipAmount)
            //  Factory function
            const rideNotification = RideNotificationFactory.createNotification(ride);
            rideNotification.send();
        } else {
            console.log('❌ Payment failed. ❌ ');
            throw new Error('Payment failed');
        };
    } catch (error) {
        console.error('Error during payment processing:', error);
    };
};

async function simulatePaymentProcessing() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const success = Math.random() > 0.2;
            resolve(success);
        }, 1000);
    });
};

// Test 1: Basic Ride Request and Completion
function test1() {
    console.log("\n🧪 Test 1: Basic Ride Request and Completion");
    const user = new User("Alice", "Visa");
    const driver = new Driver("Bob", "Tesla Model 3");
    const ride = user.requestRide("Main St", "Elm St", driver);
    driver.acceptRide(ride);
    ride.startRide();
    ride.completeRide();
};

// Test 2: Premium User with Discounted Fare and Rating System
async function test2() {
    console.log("\n🧪 Test 2: Premium User and Rating System");
    const premiumUser = new PremiumUser("Charlie", "Mastercard", "VIP Benefits");
    const driver = new Driver("Dave", "BMW i8");
    const ride = premiumUser.requestPremiumRide("Park Ave", "Madison Ave");
    driver.acceptRide(ride);
    premiumUser.rateDriver(5, "Excellent service!");
    driver.rateUser(4, "Pleasant customer");
    driver.showAverageRatinh();
    await processPayment(premiumUser, ride, 10);
};

// Test 3: VIP Driver with Ride Filtering
async function test3() {
    console.log("\n🧪 Test 3: VIP Driver Functionality");
    const vipDriver = new VIPDriver("Eve", "Porsche 911", true);
    const regularUser = new User("Frank", "Visa");
    const premiumUser = new PremiumUser("Grace", "Amex", "Premium");
    const ride1 = regularUser.requestRide("5th Ave", "Broadway", vipDriver);
    vipDriver.acceptRide(ride1);
    vipDriver.rateUser(3, "Average experience");
    const ride2 = regularUser.requestRide("Times Square", "Central Park", vipDriver);
    vipDriver.acceptRide(ride2);
};

// Test 4: Automatic Driver Matching and Location-based Assignment
async function test4() {
    console.log("\n🧪 Test 4: Automatic Driver Matching");
    const app = new RideSharingApp();
    const driver1 = new Driver("Helen", "Toyota Prius");
    const driver2 = new Driver("Ian", "Honda Civic");
    driver1.updateLocation(1, 1);
    driver2.updateLocation(0.1, 0.1);
    app.addDriver(driver1);
    app.addDriver(driver2);
    const user = new User("Jack", "Visa");
    app.addUser(user);
    console.log("Available drivers before matching:", app.getAvailableDrivers().length);
    await user.requestRideWithAutoMatch({ lat: 0, lng: 0 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Available drivers after matching:", app.getAvailableDrivers().length);
};

// Test 5: Complex Scenario with Multiple Features
async function test5() {
    console.log("\n🧪 Test 5: Complex Scenario");
    const app = new RideSharingApp();
    const regularUser = new User("Karen", "Visa");
    const premiumUser = new PremiumUser("Larry", "Mastercard", "Premium");
    const regularDriver = new Driver("Mike", "Honda Accord");
    const vipDriver = new VIPDriver("Nancy", "Mercedes S-Class", true);
    regularDriver.updateLocation(0.5, 0.5);
    vipDriver.updateLocation(1, 1);
    app.addDriver(regularDriver);
    app.addDriver(vipDriver);
    console.log("Testing concurrent ride requests...");
    await Promise.all([
        regularUser.requestRideWithAutoMatch({ lat: 0, lng: 0 }),
        premiumUser.requestPremiumRide("Airport", "Hotel")
    ]);
    const ride = premiumUser.requestRide("Hotel", "Restaurant", vipDriver);
    vipDriver.acceptRide(ride);
    ride.updateStatus('driver_assigned');
    setTimeout(() => ride.updateStatus('arriving_soon'), 1000);
    setTimeout(() => ride.updateStatus('arrived'), 2000);
    setTimeout(() => {
        ride.startRide();
        ride.completeRide();
        processPayment(premiumUser, ride, 20);
    }, 3000);
};

console.log("🚀 Starting Tests 🚀");
// test1();
// test2();
// test3();
// test4();
// test5();