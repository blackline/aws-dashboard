AWS Dashboard
=============

Manage and display a list of applications consisting of groups of EC2 and RDS instances.

Requirements
============

* A [Heroku](https://www.heroku.com/) account
* An [Firebase](http://firebase.com/) account
* A deployed [aws-dashboard-daemon](https://github.com/blackline/aws-dashboard-daemon)

Setup
=====

#### Firebase Setup

Create a Firebase application, and modify your Firebase Security to disable
unauthenticated read and write access:

    {
        "rules": {}
    }

#### Heroku Setup

Create your Heroku application

    git clone git@github.com:blackline/aws-dashboard.git
    cd aws-dashboard
    heroku apps:create [your-application-name]

The Heroku config variables which need to be set are:

* AUTH_PASSWD - The password used to login to the AWS dashboard.
* AUTH_USER - The username used to login to the AWS dashboard.
* FIREBASE_AUTH_TOKEN - The Auth Token for your Firebase data store.
* FIREBASE_URI - The URI to your Firebase data store.

Set the Heroku config variables:

    heroku config:set AUTH_PASSWD=secret \
                      AUTH_USER=admin \
                      FIREBASE_AUTH_TOKEN=SECRET \
                      FIREBASE_URI=https://YOUR_APP.firebaseio.com/

Deploy!

    git push heroku master
