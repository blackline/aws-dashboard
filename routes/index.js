
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', {
        'firebase': {
            'uri': process.env.FIREBASE_URI,
            'authToken': process.env.FIREBASE_AUTH_TOKEN
        }
    });
};
