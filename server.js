const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { PDFDocument } = require('pdf-lib');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const storageBucket = process.env.STORAGE_BUCKET || 'pdfbucket';

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (process.env.MAX_FILE_SIZE || 50) * 1024 * 1024 }, // Default 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Routes
app.post('/api/merge', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Process each uploaded PDF
    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
      
      // Clean up the uploaded file
      fs.unlinkSync(file.path);
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const mergedFilename = `merged-${Date.now()}.pdf`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(`merged/${mergedFilename}`, mergedPdfBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload to storage', details: uploadError });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(`merged/${mergedFilename}`);

    const fileUrl = urlData.publicUrl;

    // Save record to database
    const { data: dbData, error: dbError } = await supabase
      .from('merged_pdfs')
      .insert([
        {
          filename: mergedFilename,
          file_url: fileUrl,
          file_size: mergedPdfBytes.length
        }
      ])
      .select();

    if (dbError) {
      console.error('Supabase database error:', dbError);
      return res.status(500).json({ error: 'Failed to save to database', details: dbError });
    }

    res.json({
      success: true,
      filename: mergedFilename,
      fileUrl,
      fileSize: mergedPdfBytes.length,
      fileId: dbData[0]?.id,
      id: dbData[0]?.id
    });
  } catch (error) {
    console.error('Error merging PDFs:', error);
    res.status(500).json({ error: 'Failed to merge PDFs', details: error.message });
  }
});

// Get all merged PDFs
app.get('/api/pdfs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('merged_pdfs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch PDFs', details: error });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get a specific PDF by ID
app.get('/api/pdfs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('merged_pdfs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch PDF', details: error });
    }

    if (!data) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
