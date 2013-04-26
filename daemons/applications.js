var aws = require('aws-sdk'),
    firebase = require('firebase'),
    async = require('async'),
    _ = require('underscore');

// Configure AWS
aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: 'us-east-1'
});

// Export the init function
module.exports = {
    init: function () {

        // Connect to the database
        var firebaseConnection = new firebase(process.env.FIREBASE_URI);
        firebaseConnection.auth(process.env.FIREBASE_AUTH_TOKEN, function(err) {
             if (err) {
                throw "Firebase auth failed: " +  err;
            }
        });

        // Start the daemon
        awsDaemon(firebaseConnection);
    }
};

var awsDaemon = function (firebase) {
    var locals = {
        firebase: firebase,
        instances: [],
        ec2: new aws.EC2(),
        rds: new aws.RDS()
    };

    console.log("*** aws daemon start");
    async.series([
        function (callback) {
            console.log("getting a list of ec2 resources");

            // Get a list of all ec2 instances
            locals.ec2.describeInstances(null, function (err, data) {
                if (err) return callback(err);

                for (var r in data.Reservations) {
                    for (var i in data.Reservations[r].Instances) {
                        var instance = data.Reservations[r].Instances[i];

                        // Convert the tags into key => value pairs
                        if (instance.Tags) {
                            for (var t in instance.Tags) {
                                var tag = instance.Tags[t];
                                delete instance.Tags[t];

                                instance.Tags[tag.Key] = tag.Value;
                            }
                        }
                        instance.id = instance.Tags.Name;

                        locals.instances[instance.Tags.Name] = instance;
                    }
                }

                callback();
            });
        },
        function (callback) {
            console.log("getting a list of rds resources");

            // Get a list of all rds instances
            locals.rds.describeDBInstances(null, function (err, data) {
                if (err) return callback(err);

                for (var d in data.DBInstances) {
                    var instance = data.DBInstances[d];
                    instance.id = data.DBInstances[d].DBInstanceIdentifier;
                    locals.instances[instance.id] = instance;
                }

                callback();
            });
        },
        function (callback) {
            firebase.child('instances').set(locals.instances);
            callback();
        }
    ], function (err) {
        if (err) throw err;
        console.log("*** aws daemon completed");
        setTimeout(awsDaemon, process.env.AWS_DAEMON_INTERVAL, locals.firebase);
    });
};
