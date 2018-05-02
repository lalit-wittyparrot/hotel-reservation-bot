var restify = require('restify');
var builder = require('botbuilder');
var azure = require('botbuilder-azure'); 
var documentDbOptions = {
    host: 'https://lalit-12.documents.azure.com:443/', 
    masterKey: '8ZyO6WxSUPyNyGuFeFk5hM4LugTf61hW5UQLrQi2cJ5JJxrT1LC6hDNxm6NbtL0DEUCebNvox9Omhm5CVk9fBQ==', 
    database: 'botdocs',   
    collection: 'botdata'
};

var docDbClient = new azure.DocumentDbClient(documentDbOptions);

var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});
console.log("Hey there");

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
// var bot = new builder.UniversalBot(connector, function (session) {
   
//     session.send("You said: %s", session.message.text);
// })
// .set('storage', cosmosStorage);
// var bot = new builder.UniversalBot(connector);

// bot.dialog('/', [
//     // Step 1
//     function (session) {
//         builder.Prompts.text(session, 'Hi! What is your name?');
//     },
//     // Step 2
//     function (session, results) {
//         session.endDialog(`Hello ${results.response}!`);
//     }
// ]);

// var inMemoryStorage = new builder.MemoryBotStorage();

// // This is a dinner reservation bot that uses a waterfall technique to prompt users for input.
// var bot = new builder.UniversalBot(connector, [
//     function (session) {
//         session.send("Welcome to the dinner reservation.");
//         builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
//     },
//     function (session, results) {
//         session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
//         builder.Prompts.text(session, "How many people are in your party?");
//     },
//     function (session, results) {
//         session.dialogData.partySize = results.response;
//         builder.Prompts.text(session, "Whose name will this reservation be under?");
//     },
//     function (session, results) {
//         session.dialogData.reservationName = results.response;

//         // Process request and display reservation details
//         session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize} <br/>Reservation name: ${session.dialogData.reservationName}`);
//         session.endDialog();
//     }
// ]).set('storage', inMemoryStorage); // Register in-memory storage

var inMemoryStorage = new builder.MemoryBotStorage();

// This is a dinner reservation bot that uses multiple dialogs to prompt users for input.
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the dinner reservation.");
        session.beginDialog('askForDateTime');
    },
    function (session, results) {
        session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
        session.beginDialog('askForPartySize');
    },
    function (session, results) {
        session.dialogData.partySize = results.response;
        session.beginDialog('askForReserverName');
    },
    function (session, results) {
        session.dialogData.reservationName = results.response;

        // Process request and display reservation details
        session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize} <br/>Reservation name: ${session.dialogData.reservationName}`);
        session.endDialog();
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 

// Dialog to ask for a date and time
bot.dialog('askForDateTime', [
    function (session) {
        builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

// Dialog to ask for number of people in the party
bot.dialog('askForPartySize', [
    function (session) {
        builder.Prompts.text(session, "How many people are in your party?");
    },
    function (session, results) {
       session.endDialogWithResult(results);
    }
])
.beginDialogAction('partySizeHelpAction', 'partySizeHelp', { matches: /^help$/i });

// Dialog to ask for the reservation name.
bot.dialog('askForReserverName', [
    function (session) {
        builder.Prompts.text(session, "Who's name will this reservation be under?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);



// Context Help dialog for party size
bot.dialog('partySizeHelp', function(session, args, next) {
    var msg = "Party size help: Our restaurant can support party sizes up to 150 members.";
    session.endDialog(msg);
})

//The dialog stack is cleared and this dialog is invoked when the user enters 'help'.
// bot.dialog('help', function (session, args, next) {
//     session.endDialog("This is a bot that can help you make a dinner reservation. <br/>Please say 'next' to continue");
// })
// .triggerAction({
//     matches: /^help$/i,
// });

bot.dialog('help', function (session, args, next) {
    session.endDialog("This is a bot that can help you make a dinner reservation. <br/>Please say 'next' to continue");
})
.triggerAction({
    matches: /^help$/i,
    onSelectAction: (session, args, next) => {
        // Add the help dialog to the dialog stack 
        // (override the default behavior of replacing the stack)
        session.beginDialog(args.action, args);
    }
});