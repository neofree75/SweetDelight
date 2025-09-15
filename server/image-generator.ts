// Image Generation Utility for Pastry Shop Interior
// This script uses OpenAI DALL-E 3 to generate a new pastry shop interior image

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import https from "https";

// Using OpenAI integration - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generatePastryShopInterior(): Promise<string> {
  try {
    // Detailed prompt for a Slovak pastry shop interior
    const prompt = `
    Elegant Slovak pastry shop (cukráreň) interior with modern design and traditional elements:
    - Beautiful glass display cases filled with colorful pastries, cakes, and macarons
    - Warm wooden shelving and modern display cabinets
    - Soft ambient lighting with pendant lights and warm LED spotlights
    - Clean white and cream color scheme with gold accents
    - Professional pastry kitchen partially visible in background
    - Comfortable seating area with small café tables
    - Fresh flowers and plants for decoration
    - High-quality, professional photography style
    - Inviting and cozy atmosphere that makes customers want to stay
    - Traditional Slovak pastry elements subtly incorporated
    - Modern European pastry shop aesthetic
    Photography style: bright, clean, professional commercial photography with warm lighting
    `;

    console.log("Generating new pastry shop interior image...");
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size: "1024x1024",
      quality: "hd", // Use HD quality for better results
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }

    // Download and save the image
    const filename = `New_pastry_shop_interior_${Date.now()}.png`;
    const filepath = path.join(process.cwd(), "attached_assets", "generated_images", filename);
    
    console.log(`Downloading image to: ${filepath}`);
    
    await downloadImage(imageUrl, filepath);
    console.log(`✅ New pastry shop interior image generated: ${filename}`);
    
    return filename;
  } catch (error) {
    console.error("❌ Error generating image:", error);
    throw error;
  }
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (error) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(error);
    });
  });
}

// Export for use in other parts of the application
export { generatePastryShopInterior };

// CLI usage
if (require.main === module) {
  generatePastryShopInterior()
    .then((filename) => {
      console.log(`🎉 Success! New image: ${filename}`);
      console.log("You can now update the AboutSection component to use this new image.");
    })
    .catch((error) => {
      console.error("Failed to generate image:", error.message);
      process.exit(1);
    });
}