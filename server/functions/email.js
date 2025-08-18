import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const createTransporter = () => {
  if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email configuration missing. Please set EMAIL and EMAIL_PASSWORD environment variables.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Generate professional HTML email template for invoice
const generateInvoiceEmailTemplate = (invoice, paymentUrl) => {
  const formatCurrency = (amount, currencyType, fiatCurrency) => {
    if (currencyType === 'usdc') {
      return `${amount.toFixed(2)} USDC`;
    }
    return `${fiatCurrency || 'USD'} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const lineItemsHtml = invoice.lineItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
        ${formatCurrency(item.unitPrice, invoice.currencyType, invoice.fiatCurrency)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">
        ${formatCurrency(item.quantity * item.unitPrice, invoice.currencyType, invoice.fiatCurrency)}
      </td>
    </tr>
  `).join('');

  const preferredNetworkDisplay = invoice.preferredNetwork ? 
    getNetworkDisplayName(invoice.preferredNetwork) : 'Not specified';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Invoice ${invoice.id}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Payment Request</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          
          <!-- Invoice Details -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 20px;">Invoice Details</h2>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 600; color: #4a5568;">Invoice ID:</span>
                <span style="color: #2d3748;">${invoice.id}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 600; color: #4a5568;">Issue Date:</span>
                <span style="color: #2d3748;">${formatDate(invoice.createdAt)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 600; color: #4a5568;">Due Date:</span>
                <span style="color: #2d3748;">${formatDate(invoice.dueDate)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #4a5568;">Status:</span>
                <span style="color: #667eea; font-weight: 600; text-transform: uppercase;">${invoice.status}</span>
              </div>
            </div>
          </div>

          <!-- Customer Information -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">Bill To:</h3>
            <div style="color: #4a5568;">
              <p style="margin: 0; font-weight: 600; font-size: 16px;">${invoice.customerName}</p>
              <p style="margin: 5px 0 0 0;">${invoice.customerEmail}</p>
            </div>
          </div>

          <!-- Line Items -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">Items</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f7fafc;">
                  <th style="padding: 15px 12px; text-align: left; font-weight: 600; color: #4a5568; border-bottom: 2px solid #e5e5e5;">Description</th>
                  <th style="padding: 15px 12px; text-align: center; font-weight: 600; color: #4a5568; border-bottom: 2px solid #e5e5e5;">Qty</th>
                  <th style="padding: 15px 12px; text-align: right; font-weight: 600; color: #4a5568; border-bottom: 2px solid #e5e5e5;">Unit Price</th>
                  <th style="padding: 15px 12px; text-align: right; font-weight: 600; color: #4a5568; border-bottom: 2px solid #e5e5e5;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Total -->
          <div style="margin-bottom: 30px;">
            <div style="background-color: #1a202c; color: white; padding: 20px; border-radius: 8px; text-align: right;">
              <h2 style="margin: 0; font-size: 24px;">
                Total: ${formatCurrency(invoice.subtotal, invoice.currencyType, invoice.fiatCurrency)}
              </h2>
            </div>
          </div>

          ${invoice.currencyType === 'usdc' ? `
          <!-- USDC Payment Information -->
          <div style="margin-bottom: 30px; background-color: #edf2f7; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">USDC Payment Information</h3>
            <div style="margin-bottom: 10px;">
              <span style="font-weight: 600; color: #4a5568;">Preferred Network:</span>
              <span style="color: #2d3748; margin-left: 10px;">${preferredNetworkDisplay}</span>
            </div>
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #4a5568;">Recipient Address:</span>
              <code style="background-color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;">${invoice.recipientAddress}</code>
            </div>
            <p style="margin: 0; color: #718096; font-size: 14px;">
              This invoice accepts USDC payments through Circle's CCTP protocol for secure cross-chain transfers.
            </p>
          </div>
          ` : ''}

          ${invoice.memo ? `
          <!-- Notes -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">Notes</h3>
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; color: #4a5568;">
              ${invoice.memo}
            </div>
          </div>
          ` : ''}

          <!-- Payment Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; 
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      transition: transform 0.2s;">
              Pay Invoice Now
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; color: #718096; font-size: 14px;">
              This invoice was generated by Invoice Flow
            </p>
            <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 12px;">
              Questions about this invoice? Contact ${invoice.issuerName || 'the issuer'} at ${invoice.issuerEmail || 'their email address'}.
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper function to get network display name
const getNetworkDisplayName = (networkKey) => {
  const networks = {
    sepolia: "Ethereum Sepolia Testnet",
    avalancheFuji: "Avalanche Fuji Testnet",
    optimismSepolia: "Optimism Sepolia Testnet",
    arbitrumSepolia: "Arbitrum Sepolia Testnet",
    baseSepolia: "Base Sepolia Testnet",
    polygonAmoy: "Polygon Amoy Testnet"
  };
  return networks[networkKey] || networkKey;
};

// Generate reminder email template
const generateReminderEmailTemplate = (invoice, paymentUrl) => {
  const formatCurrency = (amount, currencyType, fiatCurrency) => {
    if (currencyType === 'usdc') {
      return `${amount.toFixed(2)} USDC`;
    }
    return `${fiatCurrency || 'USD'} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isOverdue = new Date() > new Date(invoice.dueDate);
  const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)) : 0;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Reminder - Invoice ${invoice.id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: ${isOverdue ? 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">
            ${isOverdue ? '⚠️ Overdue Payment' : '🔔 Payment Reminder'}
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Invoice ${invoice.id}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          
          <!-- Reminder Message -->
          <div style="margin-bottom: 30px; text-align: center;">
            <h2 style="color: #1a202c; margin: 0 0 15px 0; font-size: 24px;">
              Hello ${invoice.customerName}!
            </h2>
            ${isOverdue ? `
              <p style="color: #e53e3e; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
                Your payment is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue
              </p>
            ` : `
              <p style="color: #f59e0b; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
                This is a friendly reminder about your upcoming payment
              </p>
            `}
            <p style="color: #4a5568; font-size: 16px; margin: 0;">
              We wanted to remind you about Invoice ${invoice.id} that ${isOverdue ? 'was' : 'is'} due on ${formatDate(invoice.dueDate)}.
            </p>
          </div>

          <!-- Invoice Summary -->
          <div style="background-color: #f7fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid ${isOverdue ? '#e53e3e' : '#f59e0b'};">
            <h3 style="color: #1a202c; margin: 0 0 20px 0; font-size: 20px;">Invoice Summary</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Invoice ID:</span>
              <span style="color: #2d3748; font-weight: 600;">${invoice.id}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Amount Due:</span>
              <span style="color: #2d3748; font-weight: 700; font-size: 18px;">
                ${formatCurrency(invoice.subtotal, invoice.currencyType, invoice.fiatCurrency)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Due Date:</span>
              <span style="color: ${isOverdue ? '#e53e3e' : '#2d3748'}; font-weight: 600;">
                ${formatDate(invoice.dueDate)} ${isOverdue ? '(OVERDUE)' : ''}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600; color: #4a5568;">Status:</span>
              <span style="color: ${isOverdue ? '#e53e3e' : '#f59e0b'}; font-weight: 600; text-transform: uppercase;">
                ${isOverdue ? 'OVERDUE' : 'PENDING'}
              </span>
            </div>
          </div>

          ${invoice.currencyType === 'usdc' ? `
          <!-- USDC Payment Information -->
          <div style="margin-bottom: 30px; background-color: #edf2f7; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">USDC Payment Information</h3>
            <p style="margin: 0; color: #718096; font-size: 14px;">
              This invoice accepts USDC payments through Circle's CCTP protocol for secure cross-chain transfers.
              Simply click the payment button below to pay securely with your crypto wallet.
            </p>
          </div>
          ` : ''}

          <!-- Payment Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background: ${isOverdue ? 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100())'}; 
                      color: white; text-decoration: none; padding: 18px 36px; border-radius: 8px; 
                      font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      transition: transform 0.2s;">
              ${isOverdue ? '🚨 Pay Overdue Invoice Now' : '💰 Pay Invoice Now'}
            </a>
          </div>

          ${isOverdue ? `
          <!-- Overdue Notice -->
          <div style="background-color: #fed7d7; border: 1px solid #feb2b2; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #c53030; margin: 0 0 10px 0; font-size: 18px;">⚠️ Immediate Action Required</h3>
            <p style="color: #742a2a; margin: 0; font-size: 14px;">
              This invoice is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue. Please make payment as soon as possible to avoid any disruption to our services.
              If you have any questions or need to discuss payment arrangements, please contact us immediately.
            </p>
          </div>
          ` : `
          <!-- Friendly Reminder -->
          <div style="background-color: #fef5e7; border: 1px solid #f6d45a; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #d69e2e; margin: 0 0 10px 0; font-size: 18px;">💡 Payment Reminder</h3>
            <p style="color: #744210; margin: 0; font-size: 14px;">
              This is a friendly reminder that your payment is due soon. We appreciate your prompt attention to this matter.
              If you have any questions about this invoice, please don't hesitate to reach out to us.
            </p>
          </div>
          `}

          <!-- Contact Information -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; color: #718096; font-size: 14px;">
              Questions about this invoice? Reply to this email or contact us directly.
            </p>
            <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 12px;">
              This reminder was sent from Invoice Flow
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

// Send reminder email
export const sendReminderEmail = async (invoice, baseUrl = 'http://localhost:3000') => {
  try {
    const transporter = createTransporter();
    
    // Generate payment URL
    const paymentUrl = `${baseUrl}/pay-invoice/${invoice.id}`;
    
    // Generate reminder email HTML
    const htmlContent = generateReminderEmailTemplate(invoice, paymentUrl);
    
    // Determine if overdue
    const isOverdue = new Date() > new Date(invoice.dueDate);
    const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
    
    // Email subject
    const subject = isOverdue 
      ? `⚠️ OVERDUE: Payment Required - Invoice ${invoice.id}`
      : `🔔 Payment Reminder - Invoice ${invoice.id}`;
    
    // Email options
    const mailOptions = {
      from: {
        name: 'Invoice Flow',
        address: process.env.EMAIL
      },
      to: invoice.customerEmail,
      subject: subject,
      html: htmlContent,
      text: `
        Payment Reminder - Invoice ${invoice.id}
        
        Dear ${invoice.customerName},
        
        ${isOverdue 
          ? `This is an urgent reminder that your payment for Invoice ${invoice.id} is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.`
          : `This is a friendly reminder about your upcoming payment for Invoice ${invoice.id}.`
        }
        
        Invoice Details:
        - Invoice ID: ${invoice.id}
        - Amount Due: ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }
        - Due Date: ${new Date(invoice.dueDate).toLocaleDateString()} ${isOverdue ? '(OVERDUE)' : ''}
        - Status: ${isOverdue ? 'OVERDUE' : 'PENDING'}
        
        To pay this invoice, please visit: ${paymentUrl}
        
        ${isOverdue 
          ? 'Please make payment as soon as possible to avoid any service disruption.'
          : 'We appreciate your prompt attention to this matter.'
        }
        
        If you have any questions, please contact us.
        
        Thank you,
        Invoice Flow Team
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Reminder email sent successfully:', {
      invoiceId: invoice.id,
      to: invoice.customerEmail,
      isOverdue: isOverdue,
      messageId: info.messageId
    });
    
    return {
      success: true,
      messageId: info.messageId,
      isOverdue: isOverdue,
      paymentUrl
    };
    
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw new Error(`Failed to send reminder email: ${error.message}`);
  }
};

// Generate payment receipt email template for customer
const generateCustomerReceiptTemplate = (invoice, paymentDetails) => {
  const formatCurrency = (amount, currencyType, fiatCurrency) => {
    if (currencyType === 'usdc') {
      return `${amount.toFixed(2)} USDC`;
    }
    return `${fiatCurrency || 'USD'} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt - Invoice ${invoice.id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">✅ Payment Successful!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Payment Receipt</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          
          <!-- Thank You Message -->
          <div style="margin-bottom: 30px; text-align: center;">
            <h2 style="color: #1a202c; margin: 0 0 15px 0; font-size: 24px;">
              Thank you, ${invoice.customerName}!
            </h2>
            <p style="color: #10b981; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
              Your payment has been successfully processed
            </p>
            <p style="color: #4a5568; font-size: 16px; margin: 0;">
              This email serves as your official payment receipt for Invoice ${invoice.id}.
            </p>
          </div>

          <!-- Payment Summary -->
          <div style="background-color: #f0fdf4; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981;">
            <h3 style="color: #1a202c; margin: 0 0 20px 0; font-size: 20px;">Payment Summary</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Invoice ID:</span>
              <span style="color: #2d3748; font-weight: 600;">${invoice.id}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Amount Paid:</span>
              <span style="color: #2d3748; font-weight: 700; font-size: 18px;">
                ${formatCurrency(invoice.subtotal, invoice.currencyType, invoice.fiatCurrency)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Payment Date:</span>
              <span style="color: #2d3748; font-weight: 600;">
                ${formatDate(invoice.paidAt)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Payment Method:</span>
              <span style="color: #2d3748; font-weight: 600;">
                ${invoice.currencyType === 'usdc' ? 'USDC (Crypto)' : 'Fiat Currency'}
              </span>
            </div>
            ${paymentDetails?.paymentTxHash ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600; color: #4a5568;">Transaction ID:</span>
              <span style="color: #2d3748; font-weight: 600; font-family: monospace; font-size: 12px;">
                ${paymentDetails.paymentTxHash.slice(0, 10)}...${paymentDetails.paymentTxHash.slice(-6)}
              </span>
            </div>
            ` : ''}
          </div>

          <!-- Billing Details -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">Billing Details</h3>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px;">
              <div style="margin-bottom: 15px;">
                <span style="font-weight: 600; color: #4a5568;">Billed To:</span><br>
                <span style="color: #2d3748;">${invoice.customerName}</span><br>
                <span style="color: #718096;">${invoice.customerEmail}</span>
              </div>
              <div>
                <span style="font-weight: 600; color: #4a5568;">Billed From:</span><br>
                <span style="color: #2d3748;">${invoice.issuerName || 'Invoice Flow'}</span><br>
                <span style="color: #718096;">${invoice.issuerEmail || 'info@invoiceflow.com'}</span>
              </div>
            </div>
          </div>

          <!-- Contact Information -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; color: #718096; font-size: 14px;">
              Questions about this payment? Contact ${invoice.issuerName} at ${invoice.issuerEmail}
            </p>
            <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 12px;">
              This receipt was generated by Invoice Flow
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate payment notification email template for issuer
const generateIssuerNotificationTemplate = (invoice, paymentDetails) => {
  const formatCurrency = (amount, currencyType, fiatCurrency) => {
    if (currencyType === 'usdc') {
      return `${amount.toFixed(2)} USDC`;
    }
    return `${fiatCurrency || 'USD'} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Received - Invoice ${invoice.id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">💰 Payment Received!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Invoice ${invoice.id}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          
          <!-- Notification Message -->
          <div style="margin-bottom: 30px; text-align: center;">
            <h2 style="color: #1a202c; margin: 0 0 15px 0; font-size: 24px;">
              Great news!
            </h2>
            <p style="color: #3b82f6; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
              ${invoice.customerName} has paid Invoice ${invoice.id}
            </p>
            <p style="color: #4a5568; font-size: 16px; margin: 0;">
              The payment has been successfully processed and this invoice is now marked as paid.
            </p>
          </div>

          <!-- Payment Details -->
          <div style="background-color: #eff6ff; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1a202c; margin: 0 0 20px 0; font-size: 20px;">Payment Details</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Customer:</span>
              <span style="color: #2d3748; font-weight: 600;">${invoice.customerName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Amount Received:</span>
              <span style="color: #2d3748; font-weight: 700; font-size: 18px;">
                ${formatCurrency(invoice.subtotal, invoice.currencyType, invoice.fiatCurrency)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Payment Date:</span>
              <span style="color: #2d3748; font-weight: 600;">
                ${formatDate(invoice.paidAt)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; color: #4a5568;">Payment Method:</span>
              <span style="color: #2d3748; font-weight: 600;">
                ${invoice.currencyType === 'usdc' ? 'USDC (Crypto)' : 'Fiat Currency'}
              </span>
            </div>
            ${paymentDetails?.paymentTxHash ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600; color: #4a5568;">Transaction ID:</span>
              <span style="color: #2d3748; font-weight: 600; font-family: monospace; font-size: 12px;">
                ${paymentDetails.paymentTxHash.slice(0, 10)}...${paymentDetails.paymentTxHash.slice(-6)}
              </span>
            </div>
            ` : ''}
          </div>

          <!-- Customer Information -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">Customer Information</h3>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px;">
              <div style="margin-bottom: 10px;">
                <span style="font-weight: 600; color: #4a5568;">Name:</span>
                <span style="color: #2d3748; margin-left: 10px;">${invoice.customerName}</span>
              </div>
              <div>
                <span style="font-weight: 600; color: #4a5568;">Email:</span>
                <span style="color: #2d3748; margin-left: 10px;">${invoice.customerEmail}</span>
              </div>
            </div>
          </div>

          <!-- Action Items -->
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">📋 Next Steps</h3>
            <ul style="color: #78350f; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>The invoice has been automatically marked as paid in your system</li>
              <li>You can now proceed with delivering goods/services to the customer</li>
              <li>A payment receipt has been sent to ${invoice.customerName}</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; color: #718096; font-size: 14px;">
              This notification was sent from Invoice Flow
            </p>
            <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 12px;">
              You received this because you issued Invoice ${invoice.id}
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

// Send payment receipt emails to both parties
export const sendPaymentReceiptEmails = async (invoice, paymentDetails, baseUrl = 'http://localhost:3000') => {
  try {
    const transporter = createTransporter();
    
    // Generate customer receipt email
    const customerHtml = generateCustomerReceiptTemplate(invoice, paymentDetails);
    
    // Generate issuer notification email
    const issuerHtml = generateIssuerNotificationTemplate(invoice, paymentDetails);
    
    // Send email to customer (receipt)
    const customerMailOptions = {
      from: {
        name: 'Invoice Flow',
        address: process.env.EMAIL
      },
      to: invoice.customerEmail,
      subject: `✅ Payment Receipt - Invoice ${invoice.id}`,
      html: customerHtml,
      text: `
        Payment Receipt - Invoice ${invoice.id}
        
        Dear ${invoice.customerName},
        
        Thank you! Your payment has been successfully processed.
        
        Payment Details:
        - Invoice ID: ${invoice.id}
        - Amount Paid: ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }
        - Payment Date: ${new Date(invoice.paidAt).toLocaleDateString()}
        - Payment Method: ${invoice.currencyType === 'usdc' ? 'USDC (Crypto)' : 'Fiat Currency'}
        
        This email serves as your official payment receipt.
        
        Questions? Contact ${invoice.issuerName} at ${invoice.issuerEmail}
        
        Thank you,
        Invoice Flow Team
      `
    };

    // Send email to issuer (notification)
    const issuerMailOptions = {
      from: {
        name: 'Invoice Flow',
        address: process.env.EMAIL
      },
      to: invoice.issuerEmail,
      subject: `💰 Payment Received - Invoice ${invoice.id}`,
      html: issuerHtml,
      text: `
        Payment Received - Invoice ${invoice.id}
        
        Great news! ${invoice.customerName} has paid Invoice ${invoice.id}.
        
        Payment Details:
        - Customer: ${invoice.customerName} (${invoice.customerEmail})
        - Amount Received: ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }
        - Payment Date: ${new Date(invoice.paidAt).toLocaleDateString()}
        - Payment Method: ${invoice.currencyType === 'usdc' ? 'USDC (Crypto)' : 'Fiat Currency'}
        
        The invoice has been automatically marked as paid. You can now proceed with delivering goods/services.
        A payment receipt has been sent to the customer.
        
        Invoice Flow Team
      `
    };

    // Send both emails
    const [customerInfo, issuerInfo] = await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(issuerMailOptions)
    ]);
    
    console.log('Payment receipt emails sent successfully:', {
      invoiceId: invoice.id,
      customerEmail: invoice.customerEmail,
      issuerEmail: invoice.issuerEmail,
      customerMessageId: customerInfo.messageId,
      issuerMessageId: issuerInfo.messageId
    });
    
    return {
      success: true,
      customerMessageId: customerInfo.messageId,
      issuerMessageId: issuerInfo.messageId,
      sentTo: {
        customer: invoice.customerEmail,
        issuer: invoice.issuerEmail
      }
    };
    
  } catch (error) {
    console.error('Error sending payment receipt emails:', error);
    throw new Error(`Failed to send payment receipt emails: ${error.message}`);
  }
};

// Send invoice emails to both parties (customer and issuer)
export const sendInvoiceEmail = async (invoice, baseUrl = 'http://localhost:3000') => {
  try {
    const transporter = createTransporter();
    
    // Generate payment URL
    const paymentUrl = `${baseUrl}/pay-invoice/${invoice.id}`;
    
    // Generate customer email HTML
    const customerHtml = generateInvoiceEmailTemplate(invoice, paymentUrl);
    
    // Generate issuer confirmation HTML (simpler version)
    const issuerHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Created - ${invoice.id}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">📄 Invoice Created!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Invoice ${invoice.id}</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            
            <!-- Confirmation Message -->
            <div style="margin-bottom: 30px; text-align: center;">
              <h2 style="color: #1a202c; margin: 0 0 15px 0; font-size: 24px;">
                Invoice Successfully Created!
              </h2>
              <p style="color: #8b5cf6; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
                Your invoice has been sent to ${invoice.customerName}
              </p>
              <p style="color: #4a5568; font-size: 16px; margin: 0;">
                This is a confirmation that Invoice ${invoice.id} has been created and sent to your customer.
              </p>
            </div>

            <!-- Invoice Summary -->
            <div style="background-color: #faf5ff; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
              <h3 style="color: #1a202c; margin: 0 0 20px 0; font-size: 20px;">Invoice Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Customer:</span>
                <span style="color: #2d3748; font-weight: 600;">${invoice.customerName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Amount:</span>
                <span style="color: #2d3748; font-weight: 700; font-size: 18px;">
                  ${invoice.currencyType === 'usdc' ? 
                    `${invoice.subtotal.toFixed(2)} USDC` : 
                    `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
                  }
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Due Date:</span>
                <span style="color: #2d3748; font-weight: 600;">
                  ${new Date(invoice.dueDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #4a5568;">Status:</span>
                <span style="color: #8b5cf6; font-weight: 600; text-transform: uppercase;">
                  ${invoice.status}
                </span>
              </div>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #eff6ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">📋 What's Next?</h3>
              <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Your customer ${invoice.customerName} has received the invoice via email</li>
                <li>They can pay directly through the secure payment link</li>
                <li>You'll receive a notification when the payment is completed</li>
                <li>You can track the invoice status in your Invoice Flow dashboard</li>
              </ul>
            </div>

            <!-- Payment Link -->
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #4a5568; margin-bottom: 15px;">Customer Payment Link:</p>
              <a href="${paymentUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); 
                        color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                View Invoice
              </a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #718096; font-size: 14px;">
                This confirmation was sent from Invoice Flow
              </p>
              <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 12px;">
                You received this because you created Invoice ${invoice.id}
              </p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;
    
    // Email options for customer
    const customerMailOptions = {
      from: {
        name: 'Invoice Flow',
        address: process.env.EMAIL
      },
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.id} - Payment Request`,
      html: customerHtml,
      text: `
        Invoice ${invoice.id} - Payment Request
        
        Dear ${invoice.customerName},
        
        You have received an invoice from ${invoice.issuerName} for ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }.
        
        Invoice Details:
        - Invoice ID: ${invoice.id}
        - From: ${invoice.issuerName}
        - Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
        - Total Amount: ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }
        
        To pay this invoice, please visit: ${paymentUrl}
        
        ${invoice.memo ? `Notes: ${invoice.memo}` : ''}
        
        Thank you,
        Invoice Flow Team
      `
    };

    // Email options for issuer
    const issuerMailOptions = {
      from: {
        name: 'Invoice Flow',
        address: process.env.EMAIL
      },
      to: invoice.issuerEmail,
      subject: `📄 Invoice Created - ${invoice.id}`,
      html: issuerHtml,
      text: `
        Invoice Created - ${invoice.id}
        
        Great! Your invoice has been successfully created and sent.
        
        Invoice Details:
        - Invoice ID: ${invoice.id}
        - Customer: ${invoice.customerName} (${invoice.customerEmail})
        - Amount: ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }
        - Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
        - Status: ${invoice.status.toUpperCase()}
        
        What's Next:
        - Your customer has received the invoice via email
        - They can pay directly through the secure payment link
        - You'll receive a notification when the payment is completed
        
        Customer Payment Link: ${paymentUrl}
        
        Invoice Flow Team
      `
    };

    // Send both emails
    const [customerInfo, issuerInfo] = await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(issuerMailOptions)
    ]);
    
    console.log('Invoice emails sent successfully to both parties:', {
      invoiceId: invoice.id,
      customerEmail: invoice.customerEmail,
      issuerEmail: invoice.issuerEmail,
      customerMessageId: customerInfo.messageId,
      issuerMessageId: issuerInfo.messageId
    });
    
    return {
      success: true,
      customerMessageId: customerInfo.messageId,
      issuerMessageId: issuerInfo.messageId,
      paymentUrl,
      sentTo: {
        customer: invoice.customerEmail,
        issuer: invoice.issuerEmail
      }
    };
    
  } catch (error) {
    console.error('Error sending invoice emails:', error);
    throw new Error(`Failed to send invoice emails: ${error.message}`);
  }
};
