var FacebookStrategy = require('passport-facebook').Strategy; // Import Passport-Facebook Package
var TwitterStrategy = require('passport-twitter').Strategy; // Import Passport Twitter Package
//var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy; // Import Passport Google Package
var CanvasStrategy = require('passport-google-oauth').OAuth2Strategy; // Import Passport Google Package
var User = require('../models/user'); // Import User Model
var session = require('express-session'); // Import Express Session Package
var jwt = require('jsonwebtoken'); // Import JWT Package
var secret = 'harrypotter'; // Create custom secret to use with JWT

module.exports = function(app, passport) {
    // Start Passport Configuration Settings
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(session({ secret: secret, resave: false, saveUninitialized: true, cookie: { secure: false } }));
    // End Passport Configuration Settings

    // Serialize users once logged in   
    passport.serializeUser(function(user, done) {
        // Check if the user has an active account
        if (user.active) {
            // Check if user's social media account has an error
            if (user.error) {
                token = 'unconfirmed/error'; // Set url to different error page
            } else {
                token = jwt.sign({ username: user.username, email: user.email }, secret, { expiresIn: '24h' }); // If account active, give user token
            }
        } else {
            token = 'inactive/error'; // If account not active, provide invalid token for use in redirecting later
        }
        done(null, user.id); // Return user object
    });

    // Deserialize Users once logged out    
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user); // Complete deserializeUser and return done
        });
    });

    // Facebook Strategy    
    passport.use(new FacebookStrategy({
            clientID: '310132302703073', // Replace with your Facebook Developer App client ID
            clientSecret: '2e94e77add384b6e2b2029947c3861b4', // Replace with your Facebook Developer client secret
            callbackURL: "http://www.herokutestapp3z24.com/auth/facebook/callback", // Replace with your Facebook Developer App callback URL
            profileFields: ['id', 'displayName', 'photos', 'email']
        },
        function(accessToken, refreshToken, profile, done) {
            User.findOne({ email: profile._json.email }).select('username active password email').exec(function(err, user) {
                if (err) done(err);

                if (user && user !== null) {
                    done(null, user);
                } else {
                    done(err);
                }
            });
        }
    ));

    // Twitter Strategy
    passport.use(new TwitterStrategy({
            consumerKey: 'nAsRdF40TX5fQ7QivmuJGWWSj', // Replace with your Twitter Developer App consumer key
            consumerSecret: 'WH4MaKulaiPzrBttgS5KlQzanXmZIKZ4hmAlflfwX8jk3WNTwA', // Replace with your Twitter Developer App consumer secret
            callbackURL: "http://www.herokutestapp3z24.com/auth/twitter/callback", // Replace with your Twitter Developer App callback URL
            userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true"
        },
        function(token, tokenSecret, profile, done) {
            if (profile.emails) {
                User.findOne({ email: profile.emails[0].value }).select('username active password email').exec(function(err, user) {
                    if (err) {
                        done(err);
                    } else {
                        if (user && user !== null) {
                            done(null, user);
                        } else {
                            done(err);
                        }
                    }
                });
            } else {
                user = {}; // Since no user object exists, create a temporary one in order to return an error
                user.id = 'null'; // Temporary id
                user.active = true; // Temporary status
                user.error = true; // Ensure error is known to exist
                done(null, user); // Serialize and catch error
            }
        }
    ));

    // Google Strategy  
    // passport.use(new GoogleStrategy({
    //         clientID: '852222686887-ld3cnfu1g76lpi0bgrmpbr37css6c3o0.apps.googleusercontent.com', // Replace with your Google Developer App client ID
    //         clientSecret: 'j-k8frTBw-6u-De6vPqk3uSI', // Replace with your Google Developer App client ID
    //         callbackURL: "http://www.herokutestapp3z24.com/auth/google/callback" // Replace with your Google Developer App callback URL
    //     },
    //     function(accessToken, refreshToken, profile, done) {
    //         User.findOne({ email: profile.emails[0].value }).select('username active password email').exec(function(err, user) {
    //             if (err) done(err);

    //             if (user && user !== null) {
    //                 done(null, user);
    //             } else {
    //                 done(err);
    //             }
    //         });
    //     }
    // ));
    passport.use('canvas',new CanvasStrategy({
        authorizationURL: 'https://utah-valley-university.acme.instructure.com/login/oauth2/auth',
        tokenURL: 'https://utah-valley-university.acme.instructure.com/login/oauth2/token',
        clientID: '1529300000000000001', // Replace with your canvas developer key client ID
        clientSecret: 'ZPuSK2ZKkVQWGTK93qnZXDBvDvMkmHXXoe6iBZjwgmSbAZC5aDRbYqyjlifoc8RM', // Replace with your canvas developer key client secret
        callbackURL: "http://localhost:8080/auth/canvas/callback", // Replace with your canvas auth callback URL
        userProfileURL: "https://utah-valley-university.acme.instructure.com/api/v1/users/self/profile",
        profileFields: ['id', 'name', 'avatar_url', 'primary_email','login_id','calendar.ics']

    },
    function(accessToken, refreshToken, profile, done) {
        console.log(accessToken);
        console.log(refreshToken);
        console.log(profile);
        profile = profile._json;
        User.findOneAndUpdate({id: profile.id},{$set:{name: profile.name, accessToken: accessToken, refreshToken: refreshToken, email: profile.primary_email, avatarUrl: profile.avatar_url, calendarUrl: profile.calendar.ics, username: profile.login_id}}, {new: true}, 
            function (err, user) {
            if (err) {
                console.log("error: " + err);
                return done(err);
            }
            //No user was found... so create a new user with values from canvas (all the profile. stuff)
            if (!user) {
                console.log('no user found creating user...');
                user = new User({
                    id: profile.id,
                    name: profile.name,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    email: profile.primary_email,
                    avatarUrl: profile.avatar_url,
                    calendarUrl: profile.calendar.ics, 
                    username: profile.login_id
                });
                user.save(function (err) {
                    console.log('saving user to db...');
                    if (err) console.log(err);
                    return done(err, user);
                });
            } else {
                //found user. Return
                
                return done(err, user);
            }
        });
    }
));

    // Canvas Routes    
    app.get('/auth/canvas', passport.authenticate('canvas'));
    app.get('/auth/canvas/callback', passport.authenticate('canvas', { failureRedirect: '/canvaserror' }), function(req, res) {
        res.redirect('/canvas/' + token); // Redirect user with newly assigned token
    });


    // Google Routes    
    app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'profile', 'email'] }));
    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/googleerror' }), function(req, res) {
        res.redirect('/google/' + token); // Redirect user with newly assigned token
    });

    // Twitter Routes
    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/twittererror' }), function(req, res) {
        res.redirect('/twitter/' + token); // Redirect user with newly assigned token
    });

    // Facebook Routes
    app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/facebookerror' }), function(req, res) {
        res.redirect('/facebook/' + token); // Redirect user with newly assigned token
    });
    app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));

    return passport; // Return Passport Object
};

