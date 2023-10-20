const puppeteer = require("puppeteer");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");

const { body, validationResult } = require("express-validator");

const templateFilePath = "muayine_template.html";
const outputFilePath = "muayine_done.html";

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).send("Server runnig");
});

//1. pdf send mail
// 
app.post(
  "/api/reports",
  [
    body("fullName")
      .isLength({ min: 5 })
      .withMessage("Username must be at least 5 characters"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { body } = req;

    fs.readFile(templateFilePath, "utf8", async (err, template) => {
      if (err) {
        res.status(500).send("Error read file");
      } else {
        const renderedHTML = ejs.render(template, body);
        fs.writeFile(outputFilePath, renderedHTML, "utf8", async (err) => {
          if (err) {
            res.status(500).send("Error write file");
          }
          const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
          const page = await browser.newPage();

          const htmlContent = fs.readFileSync(outputFilePath, "utf8");
          await page.setContent(htmlContent);

          await page.pdf({
            path: body.fullName + Date.now().toString() + ".pdf",
            format: "A3",
          });
          await browser.close();
          res.status(200).send("Ok");
        });
      }
    });
  }
);

app.listen(port);
