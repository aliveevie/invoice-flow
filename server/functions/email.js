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
              If you have any questions about this invoice, please contact the issuer.
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

// Send invoice email
export const sendInvoiceEmail = async (invoice, baseUrl = 'http://localhost:3000') => {
  try {
    const transporter = createTransporter();
    
    // Generate payment URL
    const paymentUrl = `${baseUrl}/pay-invoice/${invoice.id}`;
    
    // Generate email HTML
    const htmlContent = generateInvoiceEmailTemplate(invoice, paymentUrl);
    
    // Email options
    const mailOptions = {
      from: {
        name: 'Invoice Flow',
        address: process.env.EMAIL
      },
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.id} - Payment Request`,
      html: htmlContent,
      text: `
        Invoice ${invoice.id} - Payment Request
        
        Dear ${invoice.customerName},
        
        You have received an invoice for ${invoice.currencyType === 'usdc' ? 
          `${invoice.subtotal.toFixed(2)} USDC` : 
          `${invoice.fiatCurrency || 'USD'} ${invoice.subtotal.toFixed(2)}`
        }.
        
        Invoice Details:
        - Invoice ID: ${invoice.id}
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

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Invoice email sent successfully:', {
      invoiceId: invoice.id,
      to: invoice.customerEmail,
      messageId: info.messageId
    });
    
    return {
      success: true,
      messageId: info.messageId,
      paymentUrl
    };
    
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw new Error(`Failed to send invoice email: ${error.message}`);
  }
};
