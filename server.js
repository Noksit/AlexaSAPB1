let fs = require('fs');
let cors = require('cors');
let https = require('https');
let http = require('http');
// let port = process.env.PORT | 443;
let axios = require('axios');
const consts = {
    B1SESSION: '',
    urlSL: 'https://SU-9310-75.emea.businessone.cloud.sap/b1s/v1/',
    object: {
        UserName: "cloud\\SMP.ABT",
        Password: "Shc@1234!",
        CompanyDB: "SBO_SMP_TEST",
    }
}
process.env.B1_HOST = 'https://SU-9310-75.emea.businessone.cloud.sap';
process.env.B1_PORT = '443';
process.env.B1_DATAAPI = '/b1s/v1';

process.env.B1_USER = "cloud\\SMP.ABT";
process.env.B1_PASS = "Shc@1234!";
process.env.B1_COMP = "SBO_SMP_TEST";

const express = require('express');
const bodyParser = require('body-parser');
const b1Assistant = require('./modules/b1Assistant');

const app = express();

let optionsSelfSigned = {
    key: fs.readFileSync('./server/privkey.pem'),
    cert: fs.readFileSync('./server/fullchain.pem')
};

app.use(cors())

app.use(({
             method,
             url
         }, rsp, next) => {
    rsp.on('finish', () => {
        console.log(`${rsp.statusCode} ${method} ${url}`);
    });
    next();
});

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.post('/', function (req, res) {
    console.log("requete recue");
    const context = {
        fail: () => {
            //fail with internal server error
            console.log('failure in context');
            res.sendStatus(500);
        },
        succeed: data => {
            res.send(data);
        }
    };
    b1Assistant.handler(req.body, context);
});

app.get("/", function (rq, res) {
    console.log("requete GET recue");
    res.send("Up and running")
})
let httpsServer = https.createServer(optionsSelfSigned, app);

axios.post(consts.urlSL + 'Login', consts.object).then((login) => {

    consts.B1SESSION = login.data.SessionId;
    consts.TOKEN = "Token 53e2d7cc7bd47f9220085e6ffd27d8f0";

    httpsServer.listen(1443, () => {
        console.log("Listenning on 1443, need Redirect domain:443 to local:1443");
    });

    console.log(
        `Connected for ${login.data.SessionTimeout} minutes`);
}).catch((error) => {
    console.log(error);
})

