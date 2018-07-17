// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendMessageNotification = functions.database.ref('/group_chat/messages/{newMessage}').onCreate(message => {
    console.log('sendMessageNotification detected new message:',message.val());

    var tokens = [];
    return admin.database().ref('/notification_tokens').once('value').then(tokensSnapshot => {

        const payload = {
            data: {
                title: 'New ClassChat message from '+message.val().user,
                body: message.val().text,
                timestamp: JSON.stringify(message.val().time)
            }
        };
        
        for(user_string in tokensSnapshot.val()) {
            console.log('Found user:',user_string);
            if(user_string === message.val().user) {
                console.log('(Not sending notification to '+user_string+' because they wrote the message.)');
            }
            else {
                var user_tokens = tokensSnapshot.val()[user_string];
                for(iToken in user_tokens) {
                    var token = user_tokens[iToken];
                    console.log('Found token:',token);
                    tokens.push(token);
                }
            }
        }
        if(tokens.length>0) {
            console.log('Attempting to send payload to',tokens.length,'tokens:',payload);
            return admin.messaging().sendToDevice(tokens, payload);
        }
        else {
            return Promise.resolve();
        }
    }).then((response) => {
        // For each message check if there was an error.
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', tokens[index], error);
                // Cleanup the tokens that are not registered anymore.
                if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
                    console.log('TODO: remove token',tokens[index]);
                }
            }
        });
        //return Promise.all(tokensToRemove);
        return Promise.resolve();
    });
});
