const express = require("express");
const bodyParser = require("body-parser");
//html to pdf
const puppeteer = require("puppeteer-core");
//html template write
const ejs = require("ejs");
//file read and write
const fs = require("fs");
//mail package
const nodemailer = require("nodemailer");
const { executablePath } = require('puppeteer')

const { body, validationResult } = require("express-validator");

const templateFilePath = "muayine_template.html";
const outputFilePath = "muayine_done.html";

//mail configuration
let configOptions = {
  service: "gmail",
  auth: {
    user: "revanzakaryali@gmail.com",
    pass: "ihfkqzqyoyvmxmdl",
  },
};
const transporter = nodemailer.createTransport(configOptions);

const app = express();
const port = 8080;

//middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

//app get endpoint
app.get("/", (req, res) => {
  return res.status(200).send("Server runnig");
});

//reports post endpoint
app.post(
  "/api/reports",
  [
    body("fullName")
      .isLength({ min: 5 })
      .withMessage("Username must be at least 5 characters"),
  ],
  (req, res) => {
    //validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { body } = req;

    //read html template
    fs.readFile(templateFilePath, "utf8", async (err, template) => {
      if (err) {
        return res.status(500).send("Error read file");
      } else {
        const renderedHTML = ejs.render(template, body);

        //write pdf
        fs.writeFile(outputFilePath, renderedHTML, "utf8", async (err) => {
          if (err) {
            return res.status(500).send("Error write file");
          }
          const browser = await puppeteer.launch({
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
            ],
            executablePath: executablePath()
          });
          const page = await browser.newPage();

          const htmlContent = fs.readFileSync(outputFilePath, "utf8");
          await page.setContent(htmlContent);
          const fileName = "muayine" + Date.now().toString() + ".pdf";
          await page.pdf({
            path: fileName,
            format: "A3",
          });
          await browser.close();

          //read pdf to mail
          fs.readFile("./" + fileName, async (err, data) => {
            if (err) return res.status(500).send("Error read file 2");
            var mailOptions = {
              from: "revanzakaryali@gmail.com",
              to: body.email,
              subject: "Rapor",
              text: "Tıbbı muayine raporu",
              html: "<b>Sağlıkla kalın :) </b>",
              attachments: [
                {
                  filename: fileName,
                  contentType: "application/pdf",
                  content: data
                },
              ],
            };

            await transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                return res.status(500).send("Mail send error");
              }
              return res.status(200).send("Ok");
            });
          });
        });
      }
    });
  }
);

// app.use((err, req, res, next) => {
//   return res.status(500).json({ error: "Internal Server Error" });
// });

app.listen(port);
