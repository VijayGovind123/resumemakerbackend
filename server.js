require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const fs = require("fs");
const app = express();
const puppeteer = require("puppeteer");

app.use(cors());
app.use(bodyParser.json());

const apiKey = process.env.OPEN;
const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: apiKey,
});
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  secure: false,
  auth: {
    user: "shelbyltdx5@gmail.com",
    pass: "cakjmihgkfnxtvbd",
  },
});

function generateCustomLetter(reqBody) {
  const { name, email } = reqBody;

  const doc = new PDFDocument();
  const pdfFilePath = "output.pdf";
  const pdfStream = fs.createWriteStream(pdfFilePath);
  doc.pipe(pdfStream);

  doc.fontSize(16).text(`Statement of Purpose for ${name}`);
  doc.moveDown(0.5);

  doc
    .fontSize(12)
    .text(`Date: ${new Date().toDateString()}`, { align: "right" });

  doc.moveDown(1);

  doc.fontSize(12).text(`${name}`, { align: "right" });
  doc.fontSize(12).text(`Email: ${email}`, { align: "right" });

  doc.end();

  return pdfFilePath;
}

app.get("/", function (req, res) {
  res.send("Hello world");
});

let requestCount = 1;
const rateLimit = 40;
let rateLimitExceeded = false;

app.post("/generate-sop", async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      linkedin,
      github,
      education,
      experience,
      projects,
      skills,
      extra,
      achievements,
      comp,
      jobdesc,
    } = req.body;
    console.log(req.body);

    let pdfFilePath;
    requestCount++;

    if (requestCount > rateLimit) {
      rateLimitExceeded = true;
    }
    if (rateLimitExceeded) {
      console.log("Rate limit exceeded. Generating custom letter...");
      pdfFilePath = generateCustomLetter(req.body);
    } else {
      const prompt = `
Create a professional resume in HTML format according to this job description:${jobdesc} with the following details :
also add summary at the top according to given details
Name: ${name} \n
Email: ${email}  \n
Phone: ${mobile} \n
github link: ${github} \n
linkedin link:${linkedin} \n
Work Experience: ${experience} \n
Education details : ${education} \n
Skills: ${skills} \n
Achievements:${achievements}\n
Extra curricular activites:${extra}\n
Competetive Programming:${comp}
information about Projects: ${projects} \n

Design similar to this html code :


Design the resume with these specifications:

Design a resume that is:
1.Give blue color to every link and keep times new roman font.
2.email,github,linkedin links should be in the same line and do not mention them as email , github,linkedin like that just keep the links.
3.follow this order : name,email,github,linkedin -> summary ->education ->experience -> projects -> achievements -> skills -> competetive programming -> extracurriculars  

4.seperate every section with a line .
5.Professional and easy to read, using a sans-serif font like Roboto, 12pt for the main text and 14pt for the headings.
Well-formatted, with 1.15 line spacing and text aligned to the left.
Visually appealing, using a professional color scheme like black and blue, and plenty of whitespace.
Customized to the applicant, by including relevant information such as their name, contact information, education, experience, and skills.

6.give 40px padding from every side.
7.Use bullet points to make it looking good wherever it is necessary
8.Be clear and concise.  `;
      const completion = await openai.completions.create({
        prompt: prompt,
        max_tokens: 2000,
        model: "text-davinci-003",
        temperature: 1,
      });
      const generatedText = completion.choices[0].text;
      console.log(generatedText);

      (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const htmlContent = `${generatedText}`; // Replace with your OpenAI HTML
        await page.setContent(htmlContent);
        await page.pdf({ path: "output.pdf", format: "A4" }); // You can specify the PDF format and output path
        await browser.close();
      })();

      pdfFilePath = "output.pdf";
      const mailOptions = {
        from: "shelbyltdx5@gmail.com",
        to: email,
        subject: "Your Resume",
        text: `Dear ${name} ,Here is your resume . Have a Nice Day`,
        attachments: [
          {
            filename: "sop.pdf",
            path: pdfFilePath,
            contentType: "application/pdf",
          },
        ],
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          res.status(500).send("Error sending email");
        } else {
          console.log("Email sent: " + info.response);
          res.status(200).send("Email sent successfully");
        }
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
