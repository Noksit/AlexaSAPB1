/**  This module implements the interaction of the B1 Assistant Skill with
 * the Amazon Echo device
 */

// Module to perform Service Layer Calls
const B1SL = require("./b1ServiceLayer")

exports.handler = function (event, context) {
    try {
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * prevent someone else from configuring a skill that sends requests to this function.
         * To be uncommented when SKill is ready

         if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.c014e6d6-a7a4-44ee-8b2f-9b10c7969743") {
             context.fail("Invalid Application ID");
        }
         */

        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        //context.fail("Exception: " + e);
        console.log('exception: ' + e.message);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);
    // Dispatch to skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    console.log(intentRequest);
    let intent = intentRequest.intent;
    intentName = extractIDelseValue('PreviousIntent', intent, session);

    console.log('CURRENT Intent is ' + intent.name);
    console.log('PREVIOUS intent was ' + intentName);

    if ("AMAZON.StopIntent" === intent.name ||
        "AMAZON.CancelIntent" === intent.name) {
        handleSessionEndRequest(callback);
    }

    if (intentName === null) {
        intentName = intent.name;
    }

    // Dispatch to your skill's intent handlers
    console.log("On a une intention !");
    console.log(intentName);
    switch (intentName) {
        case "SayHello":
            sayHello(intent, session, callback);
            break;

        case "SalesInfo":
            getSalesInfo(intent, session, callback);
            break;

        case "MakePurchase":
            postPurchase(intent, session, callback);
            break;

        case "AMAZON.HelpIntent":
            getWelcomeResponse(callback);
            break;

        case "GetPhoneNumber":
            getPhoneNumber(intent, session, callback);
            break;

        case "GetCommercialInformation":
            GetCommercialInformation(intent, session, callback);
            break;

        default:
            throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}

// --------------- Functions that control the skill's behavior -----------------------
function getWelcomeResponse(callback) {
    let sessionAttributes = {};
    let cardTitle = "Welcome";
    let speechOutput = getWelcomeMessage();

    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    let repromptText = 'Quelle est votre demande ?';
    let shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    let cardTitle = "Session Ended";
    //let speechOutput = "Thank you for using B1 Assistant. Have a nice day!";
    let speechOutput = "Okay.";

    // Setting this to true ends the session and exits the skill.
    let shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}


/**
 * B1 Interactions
 */
function sayHello(intent, session, callback) {

    let cardTitle = intent.name;
    let repromptText = "";
    let sessionAttributes = {};
    let shouldEndSession = true;
    let speechOutput = "";

    speechOutput = "Bonjour"

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


function getSalesInfo(intent, session, callback) {

    //Default
    let repromptText = null;
    let sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";

    let SalesQuarter = extractIDelseValue('SalesQuarter', intent, session)
    let SalesYear = extractIDelseValue('SalesYear', intent, session)

    sessionAttributes = handleSessionAttributes(sessionAttributes, 'SalesQuarter', SalesQuarter);
    sessionAttributes = handleSessionAttributes(sessionAttributes, 'SalesYear', SalesYear);

    if (SalesQuarter == null) {
        speechOutput = "Pour quel trimestre et quelle année";
        repromptText = "Dites moi le trimestre et l'année";
    } else if (SalesYear == null) {
        speechOutput = "Quelle année avez vous besoin ?";
        repromptText = "Comme l'année derniere, cette année";
    } else {

        B1SL.GetSalesInfo(SalesYear, SalesQuarter, function (err, response) {
            if (err) {
                console.error(error)
                speechOutput = "Il y a un probleme avec le Service Layer. Please check logs"
            } else {
                console.log("Sales Info Retrieved. Building speech Outbut")

                response = response.value

                if (response.length == 0) {
                    speechOutput = "Je suis desolé mais il n'y a pas de vente pour le trimestre numero " +
                        SalesQuarter + " de l'année " + SalesYear;
                } else {
                    speechOutput = "Les vente pour le " + stringQuarter(SalesQuarter) + " trimestre de " +
                        SalesYear + " sont de " + response[0].NetSalesAmountLC_SUM + " " +
                        response[0].BusinessPartnerCurrency + ". ";

                    for (let i = 1; i < response.length; i++) {
                        speechOutput += "Egalement" + response[i].NetSalesAmountLC_SUM + " " +
                            response[i].BusinessPartnerCurrency + ". ";
                        if (i != response.length - 1) {
                            speechOutput += "Et "
                        }
                    }

                }
            }

            shouldEndSession = true;

            // callback with result
            callback(sessionAttributes,
                buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession)
            );
        });
        return;
    }

    sessionAttributes = handleSessionAttributes(sessionAttributes, 'PreviousIntent', intent.name);


    // Call back while there still questions to ask
    callback(sessionAttributes,
        buildSpeechletResponse(
            intent.name, speechOutput,
            repromptText, shouldEndSession
        )
    );
}


function getPhoneNumber(intent, session, callback) {
    let repromptText = null;
    let sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";

    let Partner = extractIDelseValue('Partner', intent, session)
    sessionAttributes = handleSessionAttributes(sessionAttributes, 'Partner', Partner);
    if (Partner == null) {
        speechOutput = "De quel client ?";
        repromptText = "Le numéro de qui ?";
    } else {
        console.log("Lets go get PhoneNumber");
        B1SL.GetPhoneNumber(Partner, function (err, response) {
            if (err) {
                console.error(err)
                speechOutput = "Il y a un probleme avec le Service Layer. Please check logs"
            } else {

                if (response.Phone1 == "" || response.Phone1 == null) {
                    speechOutput = "je suis désolé mais ce partenaire n'a pas de telephone enregistré dans la base de donnée"
                } else {
                    let phone = formatPhoneNumber(response.Phone1)
                    speechOutput = "Le numéro de téléphone est " + phone;
                }
            }

            shouldEndSession = true;

            // callback with result
            callback(sessionAttributes,
                buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession)
            );
        });
        return;
    }

    sessionAttributes = handleSessionAttributes(sessionAttributes, 'PreviousIntent', intent.name);


    // Call back while there still questions to ask
    callback(sessionAttributes,
        buildSpeechletResponse(
            intent.name, speechOutput,
            repromptText, shouldEndSession
        )
    );
}

function GetCommercialInformation(intent, session, callback) {
    let repromptText = null;
    let sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";

    let document = extractIDelseValue('Document', intent, session)
    let status = extractIDelseValue('Status', intent, session)
    let documentTypeSaid = extractValue('Document', intent, session)
    sessionAttributes = handleSessionAttributes(sessionAttributes, 'Partner', document);
    sessionAttributes = handleSessionAttributes(sessionAttributes, 'Status', status);

    if (document == null) {
        speechOutput = "de quel type de document ?";
        repromptText = "des factures, commande, devis ?";
    } else {
        console.log("Lets go get Commercial Information");
        B1SL.GetCommercialInformations(document, status, function (err, response) {
            if (err) {
                console.error(err)
                speechOutput = "Il y a un probleme avec le Service Layer."
            } else {
                let resp = response.value;
                let count = resp.length
                let amount = 0;
                resp.forEach((resp) => {
                    amount += parseFloat(resp.DocTotal)
                })
                if (status == "topay") {
                    speechOutput = `Il y a ${count} ${documentTypeSaid} non encaissé.`
                    if (count == 0) {
                        speechOutput = `Il n'y a aucun ${documentTypeSaid} non encaissé. Beau boulot`
                    }
                } else {
                    speechOutput = `Actuellement, il y a ${count} ${documentTypeSaid} pour un montant de ${amount} euros.`;
                }
            }

            shouldEndSession = true;

            // callback with result
            callback(sessionAttributes,
                buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession)
            );
        });
        return;
    }

    sessionAttributes = handleSessionAttributes(sessionAttributes, 'PreviousIntent', intent.name);


    // Call back while there still questions to ask
    callback(sessionAttributes,
        buildSpeechletResponse(
            intent.name, speechOutput,
            repromptText, shouldEndSession
        )
    );
}


function postPurchase(intent, session, callback) {

    //Default
    let repromptText = null;
    let sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";

    //Define Variables from Intent or from Session Attributes

    let ItemName = extractIDelseValue('ItemName', intent, session)
    let Quantity = extractIDelseValue('Quantity', intent, session)
    let ItemRecom = extractIDelseValue('ItemRecom', intent, session)

    let ItemRecomName = null;
    let params = null;

    sessionAttributes = handleSessionAttributes(sessionAttributes, 'ItemName', ItemName);
    sessionAttributes = handleSessionAttributes(sessionAttributes, 'Quantity', Quantity);


    // Answer to: Do you need anything else?
    if (intent.name == "AMAZON.YesIntent") {
        ItemRecom = extractIDelseValue('ItemRecom', intent, session)
    } else if (intent.name == "AMAZON.NoIntent") {
        ItemRecom = null;
    } else {
        sessionAttributes = handleSessionAttributes(sessionAttributes, 'PreviousIntent', intent.name);
    }


    if (ItemName == null) {
        speechOutput = "Que dois je commander ?";
        repromptText = "Vous pouvez dire. J'ai besoin d'une cle usb. Ou achete moi du papier";
    } else if (Quantity == null) {
        speechOutput = "D'accord, combien en souhaitez vous ?";
        repromptText = "Dites moi la quantité necessaire.";
    } else if (ItemRecom == null && intent.name != "AMAZON.NoIntent") {
        speechOutput = "Autre chose ?";
        repromptText = "Dois je commander autre chose ?";

    } else {

        B1SL.PostSalesOrder(ItemName, Quantity, extractItem(ItemRecom), function (err, response) {
            if (err) {
                console.error(err)
                speechOutput = "Il y a un probleme avec le Service Layer. "
            } else {
                speechOutput = "Vore commande numero " + response.DocNum + " a correctement été faite." +
                    "Le montant total de la commande est de " + response.DocTotal +
                    " " + response.DocCurrency;
            }
            shouldEndSession = true;

            // call back with result
            callback(sessionAttributes,
                buildSpeechletResponse(
                    intent.name, speechOutput,
                    repromptText, shouldEndSession
                )
            );
        })
        return;
    }

    console.log(JSON.stringify(sessionAttributes));

    // Call back while there still questions to ask
    callback(sessionAttributes,
        buildSpeechletResponse(
            intent.name, speechOutput,
            repromptText, shouldEndSession
        )
    );
}


// --------------- Handle of Session Attributes -----------------------
function extractIDelseValue(attr, intent, session) {
    if (session.attributes) {
        if (attr in session.attributes) {
            console.log("Session attribute " + attr + " is " + session.attributes[attr]);
            return session.attributes[attr];
        }
    }

    console.log("No session attribute for " + attr);
    if (intent.slots) {
        if (attr in intent.slots && 'value' in intent.slots[attr]) {
            let slot = intent.slots[attr]
            try {
                //Try to returns slot ID otherwise returns slot value
                return slot.resolutions.resolutionsPerAuthority[0].values[0].value.id
            } catch (e) {
                return intent.slots[attr].value;
            }
        }
    }
    return null;
}

function extractValue(attr, intent, session) {
    if (session.attributes) {
        if (attr in session.attributes) {
            console.log("Session attribute " + attr + " is " + session.attributes[attr]);
            return session.attributes[attr];
        }
    }

    console.log("No session attribute for " + attr);
    if (intent.slots) {
        if (attr in intent.slots && 'value' in intent.slots[attr]) {
            return intent.slots[attr].value;
        }
    }
    return null;
}


function handleSessionAttributes(sessionAttributes, attr, value) {

    //if Value exists as attribute than returns it
    console.log("Previous " + attr + "is: " + value)
    if (value) {
        sessionAttributes[attr] = value;
    }
    return sessionAttributes;
}

// --------------- Auxiliar Functions Formatting -----------------------

function formatPhoneNumber(phoneNumberString) {
    let cleaned = ('' + phoneNumberString).replace(/\D/g, '')
    let match = cleaned.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
    if (match) {
        return match[1] + '. ' + match[2] + '. ' + match[3] + '. ' + match[4] + '. ' + match[5]
    }
    return null
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function stringQuarter(input) {

    if (input == '01' || input == 'Q1') {
        return 'premier';
    }

    if (input == '02' || input == 'Q2') {
        return 'second';
    }

    if (input == '03' || input == 'Q3') {
        return 'troisieme';
    }

    if (input == '04' || input == 'Q4') {
        return 'quatrieme';
    }

}

function extractItem(item) {
    if (item === null) {
        return null;
    }

    let auxitem = item.toLowerCase();

    if (auxitem.indexOf('ink') >= 0) {
        return 'I00008';
    }

    if (auxitem.indexOf('paper') >= 0) {
        return 'R00001';
    }

    if (auxitem.indexOf('drive') >= 0) {
        return 'I00004';
    }
    return item;
}

// -------------------- Speech Functions Formatting -----------------------
function getWelcomeMessage() {
    let message = [];

    message[0] = "Bonjour, comment puis-je vous aider ?"
    return message[getRandomInt(0, message.length - 1)];
}

// --------------- Helpers that build all of the responses -----------------------
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    console.log("ALEXA: " + output);
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Standard",
            title: title,
            text: output,
            image: {
                smallImageUrl: "https://i.imgur.com/FVTjmsN.png"
            }
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}