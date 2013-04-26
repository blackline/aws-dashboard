# AWS Dashboard

Manage and display a list of applications consisting of groups of EC2 and RDS instances.

The AWS dashboard is designed to be deployed to [Heroku](http://heroku.com),
and uses [Firebase](http://firebase.com) as a data store.

It requires your [AWS Security Credentials](https://portal.aws.amazon.com/gp/aws/securityCredentials)
in the form of your AWS Access key and AWS Secret Key, and a [Firebase Auth Token](https://www.firebase.com/docs/security/custom-login.html).

## Setup

Create your Heroku application

    git clone git@github.com:blackline/aws-dashboard.git
    cd aws-dashboard
    heroku apps:create [your-application-name]

Set the Heroku config variables:

    heroku config:set AWS_DAEMON_ENABLED=1 \
                      AWS_DAEMON_INTERVAL=300000 \
                      AUTH_PASSWD=secret \
                      AUTH_USER=admin \
                      AWS_ACCESS_KEY=FOO_BAR_BAZ \
                      AWS_SECRET_KEY=SECRET \
                      FIREBASE_AUTH_TOKEN=SECRET \
                      FIREBASE_URI=https://YOUR_APP.firebaseio.com/

Description of the Heroku config variables

    * AWS_DAEMON_ENABLED - Enable the AWS daemon, which polls AWS for an updated list of your EC2 and RDS instances.
    * AWS_DAEMON_INTERVAL - How often, in milliseconds, should the AWS daemon run.
    * AUTH_PASSWD - The password used to login to the AWS dashboard.
    * AUTH_USER - The username used to login to the AWS dashboard.
    * AWS_ACCESS_KEY - Your AWS Access key. Requires at least `read` level privileges for EC2 and RDS.
    * AWS_ACCESS_KEY - Your AWS Secret key.
    * FIREBASE_AUTH_TOKEN - The Auth Token for your Firebase data store.
    * FIREBASE_URI - The URI to your Firebase data store.

Deploy to Heroku

    git push heroku master

Done!
