const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  '773379790503-67bte4un8jd81lguqnp2hh6br6n0j7fn.apps.googleusercontent.com',
  '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',
  'http://localhost:8080'
);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES
});

console.log('Authorize this app by visiting this URL:', authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Your token:', token);
  });
});
