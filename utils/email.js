const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Natours <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    // IN DEVELOPMENT ENV
    // 1. Create a transporter - a service that will actually send the email
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      // Mistake: port should be a number, not a string, so use Number() to convert it
      port: Number(process.env.EMAIL_PORT),

      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Activate in Gmail "less secure app" option
      // Mailtrap - is a good alternative for testing email sending during development
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1. Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      { firstName: this.firstName, url: this.url, subject }
    );

    // 2. Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    // 3. Create a transport and send email
    //   await transporter.sendMail(mailOptions);
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome', 'Welcome to the Natours.'); // Call send() on the current obj
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token(valid for only 10 minutes)'
    );
  }
};

// new Email(user, url).sendWelcome();
