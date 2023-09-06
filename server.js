require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const fs = require("fs");
const app = express();
//const puppeteer = require("puppeteer");

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
      const prompt = `Generate a professional resume for applying for job of a job description : ${jobdesc} \nneatly with  appropriate spacing and points with the following sections:

      
      Summary : write the short introduction as a student with the use of details  given below using ai \n
      Education:${education} \n
      Experience: ${experience} \n
      Projects: ${projects} \n 
      Achievements: ${achievements} \n
      Technical Skills: ${skills} \n
      Competitive Programming: ${comp} \n
      Extra-curricular Activities: ${extra}]\n
      
      Please include the delimiter "ABCDE" between each section for easy parsing and also modify the content professionally using AI.
      Please dont include name and job description in the resume and also add one line space after every heading
      also start the content without any newlines at the starting of the resume.
      remove unwanted symbols , use only bulllet points and also use good language .`;

      const completion = await openai.completions.create({
        prompt: prompt,
        max_tokens: 2000,
        model: "text-davinci-003",
        temperature: 1,
      });
      const resumeText = completion.choices[0].text;
      console.log(resumeText);
      const sections = resumeText.split("ABCDE");
      console.log(sections.length);
      console.log(sections);

      const doc = new PDFDocument({ margin: 50 });
      const pdfFilePath = "output.pdf";
      const pdfStream = fs.createWriteStream(pdfFilePath);
      doc.pipe(pdfStream);

      const fontPath = "sfpro.ttf"; // Replace with the path to your TTF font

      // Set the font for the entire document
      doc.font(fontPath);

      // Create the custom letter content in a formal manner

      doc.fontSize(16).text(`${name}`);
      doc.moveDown(1);
      doc.fontSize(12).text(` LinkedIn | `, {
        continued: true,
        link: linkedin,
      });

      // Add GitHub link
      doc.fontSize(12).text(` Github |`, {
        continued: true,
        link: github,
      });

      // Add email link
      doc
        .fontSize(12)
        .text(` ${email} |`, { continued: true, link: `mailto:${email}` });
      doc
        .fontSize(12)
        .text(` ${mobile} `, { continued: true, link: `tel:${mobile}` });

      doc.moveDown(2);
      // Add phone number link
      let indx = 1;
      sections.forEach((section) => {
        if (indx != 1) {
        doc
          .strokeColor("#000000")
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();
        }
        indx++;
        doc.fontSize(12).text(section);
        doc.moveDown(1);
      });

      doc.end();
      const mailOptions = {
        from: "shelbyltdx5@gmail.com",
        to: email,
        subject: "Your Resume",
        text: `Dear ${name} ,Here is your resume . Have a Nice Day`,
        attachments: [
          {
            filename: "resume.pdf",
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
