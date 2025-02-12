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
        this.ratings = []
    };

    //TODO - maybe add to RideSharingApp -> more logic
    requestRide(pickupLocation, dropoffLocation) {
        const ride = new Ride(this, pickupLocation, dropoffLocation);
        const rideNotification = RideNotificationFacotry.createNotification(ride);
        rideNotification.send();
        return ride;
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
    };

    acceptRide(ride) {
        if (this.available) {
            ride.assignDriver(this);
            const rideNotification = RideNotificationFacotry.createNotification(ride);
            rideNotification.send();
            this.available = false;
        };
    };

    rateUser(score, feedback) {
        const rating = new Rating(score, feedback);
        this.ratings.push(rating.submit());
        console.log(`${this.name} rated a user with a score of ${score}/5`);
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
    }

    calculateFare() {
        return Math.random() * 50 + 10;
    }

    assignDriver(driver) {
        this.driver = driver;
        this.status = 'active';
    }

    completeRide() {
        this.status = 'completed';
        if (this.driver) {
            this.driver.available = true;
        }
    }
}

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
//-------------------->
//-------------------->
//-------------------->

// class RideObserver {
//     notify(ride) {
//         console.log(`New ride requested: ${ride.pickupLocation} to ${ride.dropoffLocation}`);
//     }
// }

// const rideObserver = new RideObserver();

// class RideWithObserver extends Ride {
//     constructor(user, pickupLocation, dropoffLocation) {
//         super(user, pickupLocation, dropoffLocation);
//         rideObserver.notify(this);
//     }
// }

//-------------------->
//-------------------->
//-------------------->
class RideNotificationFacotry {
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
        const driver = availableDrivers[0];
        const ride = user.requestRide("Sofia", "Vidin");

        setTimeout(() => {
            driver.acceptRide(ride);
            const rideNotification = RideNotificationFacotry.createNotification(ride);
            rideNotification.send();
        }, 1000)
    } catch (error) {
        throw new Error('Failed fetching available drivers...')
    }
};

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

async function processPayment(user, ride) {
    try {
        console.log(`Processing payment for ride from ${ride.pickupLocation} to ${ride.dropoffLocation} [${user.name}]`);

        const paymentSuccess = await simulatePaymentProcessing();

        if (paymentSuccess) {
            console.log('Payment successful!');
            ride.completeRide();
            const rideNotification = RideNotificationFacotry.createNotification(ride);
            rideNotification.send();
        } else {
            console.log('Payment failed.');
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
    const ride1 = user1.requestRide("Main St", "Elm St");
    driver1.acceptRide(ride1);
    processPayment(user1, ride1);
};

// Test 2: Regular Ride Request and Payment Failure
function test2() {
    const user2 = new User("Jane Smith", "2345-6789-8765-4321");
    const driver2 = new Driver("Bob", "Ford Mustang");
    const ride2 = user2.requestRide("Broadway", "5th Ave");
    driver2.acceptRide(ride2);
    processPayment(user2, ride2);
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
    const ride3 = user3.requestRide("King St", "Queen St");
    vipDriver.acceptVIPRide(ride3);
    processPayment(user3, ride3);
};

// Test 5: Multiple Rides with Mixed Payment Results
function test5() {
    const user4 = new User("Michael Jordan", "5678-9012-3456-7890");
    const user5 = new PremiumUser("LeBron James", "6789-0123-4567-8901", "Premium access");
    const driver4 = new Driver("Zoe", "Chevrolet Volt");
    const driver5 = new VIPDriver("Chris", "Porsche 911", true);
    const ride4 = user4.requestRide("Liberty St", "Broadway");
    const premiumRide2 = user5.requestPremiumRide("Wall St", "7th Ave");
    driver4.acceptRide(ride4);
    driver5.acceptVIPRide(premiumRide2);
    processPayment(user4, ride4);
    processPayment(user5, premiumRide2);

};

// test1();
// test2();
test3();
// test4();
// test5();
