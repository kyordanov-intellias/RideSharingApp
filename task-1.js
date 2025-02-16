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

    //TODO - maybe add to RideSharingApp -> more logic
    requestRide(pickupLocation, dropoffLocation, driver) {
        const ride = new Ride(this, pickupLocation, dropoffLocation);
        ride.subscribeToObserver(this);

        if (driver.available) {
            ride.subscribeToObserver(driver);
        } else {
            throw new Error(`${driver.name} is already on a ride! Please, wait for another driver to accept your ride.`);
        };
        return ride;
    };

    giveTip(ride, amount) {
        if (amount >= 0) {
            ride.tip = amount;
            console.log(`${this.name} gave a tip of $${amount.toFixed(2)} for this ride.`);
            ride.notifyObservers();
        } else {
            console.log("Invalid tip amount.");
        }
    }

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
        }
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
            let avr = total / this.ratings.length;
            console.log(`Average rating of ${this.name} is ${avr}`);
        } else {
            console.log(`The driven doesn't have score yet!`);
        };
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
        this.status = 'completed';
        if (this.driver) {
            this.driver.available = true;
        };
        this.notifyObservers();
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
    }

    notifyObservers() {
        for (const observer of this.observers) {
            observer.update(this)
        };
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
    }

    acceptVIPRide(ride) {
        if (this.vipStatus) {
            super.acceptRide(ride);
            console.log(`VIP driver assigned - ${ride.driver.name} with car model ${ride.driver.carDetails} for ${ride.user.name}!`);
        }
    }
}

class Rating {
    constructor(score, feedback) {
        this.score = score;
        this.feedback = feedback || '';
        this.timestamp = Date.now();
    }

    submit() {
        if (this.score < 1 || this.score > 5) {
            throw new Error("Rating score must be between 1 and 5.");
        }
        console.log(`Rating submitted: ${this.score}/5. Feedback: ${this.feedback}`);
        return this;
    }
}

class RideNotificationFactory {
    static createNotification(ride) {
        if (ride.status === 'active') {
            return new ActiveRideNotification(ride);
        } else if (ride.status === 'completed') {
            return new CompletedRideNotification(ride);
        }
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

        }
    };
};

class PendingRideNotification extends RideNotification {
    send() {
        console.log(`Pending ride notification for ${this.ride.user.name}`);
    };
};

async function matchRide(user) {
    try {
        const availableDrivers = await getAvailableDrivers();
        if (availableDrivers.length === 0) {
            throw new Error('No available drivers at the moment');
        }

        const driver = availableDrivers[0];

        const ride = user.requestRide("Sofia", "Vidin", driver);

        setTimeout(() => {
            driver.acceptRide(ride);
            const rideNotification = RideNotificationFactory.createNotification(ride);
            rideNotification.send();
        }, 1000);

    } catch (error) {
        console.error('Error matching ride:', error.message);
    }
}


async function getAvailableDrivers() {
    const mockDrivers = [
        new Driver("Alice", "Tesla Model S"),
        new Driver("Bob", "Ford Mustang")
    ];
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(mockDrivers)
        }, 1000)
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
        }
    } catch (error) {
        console.error('Error during payment processing:', error);
    }
};

async function simulatePaymentProcessing() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const success = Math.random() > 0.2;
            resolve(success);
        }, 1000);
    });
}


// Test 1: Regulat Ride Request and Payments Success
function test1() {
    const user1 = new User("John Doe", "1234-5678-9876-5432");
    const driver1 = new Driver("Alice", "Tesla Model S");
    const ride1 = user1.requestRide("Main St", "Elm St", driver1);;
    driver1.acceptRide(ride1);
    processPayment(user1, ride1);
};

// Test 2: Regular Ride Request and Payment Failure
function test2() {
    const user2 = new User("Jane Smith", "2345-6789-8765-4321");
    const driver2 = new Driver("Bob", "Ford Mustang");
    const ride2 = user2.requestRide("Broadway", "5th Ave", driver2);
    driver2.acceptRide(ride2);
    processPayment(user2, ride2, 20);
};

// Test 3: Premium User with Discounted Fare
function test3() {
    const premiumUser = new PremiumUser("Charlie Brown", "3456-7890-9876-4321", "VIP access to premium rides");
    const driver3 = new Driver("Eve", "BMW i8");
    const premiumRide = premiumUser.requestPremiumRide("Park Ave", "Madison Ave");
    driver3.acceptRide(premiumRide);
    processPayment(premiumUser, premiumRide);

};

// Test 4: VIP Driver Accepts Ride
function test4() {
    const vipDriver = new VIPDriver("Grace", "Audi Q7", true);
    const user3 = new User("Daniel Craig", "4567-8901-2345-6789");
    const ride3 = user3.requestRide("King St", "Queen St", vipDriver);
    vipDriver.acceptVIPRide(ride3);
    processPayment(user3, ride3);
};

// Test 5: Multiple Rides with Mixed Payment Results
function test5() {
    const user4 = new User("Michael Jordan", "5678-9012-3456-7890");
    const user5 = new PremiumUser("LeBron James", "6789-0123-4567-8901", "Premium access");
    const driver4 = new Driver("Zoe", "Chevrolet Volt");
    const driver5 = new VIPDriver("Chris", "Porsche 911", true);
    const ride4 = user4.requestRide("Liberty St", "Broadway", driver4);
    const premiumRide2 = user5.requestPremiumRide("Wall St", "7th Ave");
    driver4.acceptRide(ride4);
    driver5.acceptVIPRide(premiumRide2);
    processPayment(user4, ride4);
    processPayment(user5, premiumRide2);

};

// Test 6: Add rating to User or Driver
function test6() {
    const user1 = new User("Alice", "Visa");
    const driver1 = new Driver("Bob", "Tesla Model 3");
    user1.rateDriver(5, "Excellent ride, very friendly!");
    driver1.rateUser(4, "User was nice, but a bit late.");
    user1.rateDriver(3, "Driver was okay, but the car wasn't clean.");
    driver1.rateUser(5, "Great user, very punctual!");
    driver1.showAverageRatinh();
}

function test7() {
    const user = new User('Alice', 'paymentDetails');
    const driver = new Driver('Bob', 'Tesla Model 3');
    const ride = user.requestRide('Sofia', 'Vidin', driver);
    driver.acceptRide(ride);
    ride.completeRide();
};

async function test8() {
    const user2 = new User("Jane Smith", "2345-6789-8765-4321");
    const user3 = new User("denkata", "2345-6789-8765-4321");
    try {
        await matchRide(user2);
        await matchRide(user3);
    } catch (error) {
        console.log("Error in ride matching:", error.message);
    };
};

// test1();
// test2();
// test3();
// test4();
// test5();
// test6();
// test7();
test8();