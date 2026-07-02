import Hono from "hono";
import { serve } from "@hono/node-server";
import OpenAI from "openai";
import Replicate from "replicate";

const app = new Hono();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const designPrompts = [
  "bright neon graffiti style t-shirt design with 'SLICK LICKS' in bold chaotic letters, recovery theme, random splashes of color, space vibes, psychedelic",
  "graffiti meets space art, 'SLICK LICKS' logo huge and bold, bright pink and cyan colors, recovery message, abstract shapes, chaotic energy",
  "street art style 'SLICK LICKS' design, bright colors, recovery-focused, random geometric shapes, graffiti texture, cosmic background",
  "bold graffiti 'SLICK LICKS' with recovery symbols, bright neon colors, chaotic composition, space elements, street art vibe",
  "psychedelic graffiti 'SLICK LICKS' design, bright rainbow colors, recovery theme, random splatter effects, cosmic energy",
  "street graffiti 'SLICK LICKS' in bold letters, bright colors, recovery message, chaotic layout, space-inspired elements",
  "neon graffiti 'SLICK LICKS' logo, bright electric colors, recovery vibes, random abstract elements, cosmic background",
];

const contentPrompts = [
  "Write a short, catchy social media post (1-2 sentences) for a recovery-focused t-shirt brand called 'Slick Licks'. Make it motivational, fun, and relatable to people in recovery. Include an emoji.",
  "Create a product description for a 'Slick Licks' t-shirt. Keep it brief, fun, and recovery-focused. Mention the chaotic, random design style.",
  "Write a funny, motivational tweet for 'Slick Licks' recovery brand. Keep it under 280 characters. Include relevant emoji.",
  "Create an Instagram caption for a 'Slick Licks' t-shirt reveal. Make it engaging, recovery-themed, and fun. Include 3-5 relevant hashtags.",
  "Write a short testimonial-style post for 'Slick Licks'. Make it sound like a real customer talking about how the shirt helped them.",
];

app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Slick Licks - AI Design Generator</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Arial', sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
          text-align: center;
          color: white;
          margin-bottom: 40px;
        }
        h1 { font-size: 3em; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); margin-bottom: 10px; }
        .subtitle { font-size: 1.2em; opacity: 0.9; }
        .controls {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .button-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        button {
          padding: 12px 24px;
          font-size: 1em;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }
        .btn-design {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-design:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
        .btn-content {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        .btn-content:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(245, 87, 108, 0.4); }
        .btn-both {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }
        .btn-both:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .status {
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          display: none;
        }
        .status.show { display: block; }
        .status.loading { background: #e3f2fd; color: #1976d2; }
        .status.success { background: #e8f5e9; color: #388e3c; }
        .status.error { background: #ffebee; color: #d32f2f; }
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .card {
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          transition: transform 0.3s;
        }
        .card:hover { transform: translateY(-5px); }
        .card-image {
          width: 100%;
          height: 300px;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9em;
          color: #999;
          text-align: center;
          padding: 20px;
        }
        .card-image img { width: 100%; height: 100%; object-fit: cover; }
        .card-content {
          padding: 20px;
        }
        .card-title { font-weight: bold; margin-bottom: 10px; font-size: 1.1em; }
        .card-text { font-size: 0.9em; color: #666; line-height: 1.5; margin-bottom: 15px; }
        .card-actions {
          display: flex;
          gap: 10px;
        }
        .card-actions a, .card-actions button {
          flex: 1;
          padding: 8px;
          text-align: center;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          font-size: 0.9em;
        }
        .card-actions a:hover, .card-actions button:hover { background: #764ba2; }
        .empty { text-align: center; color: #999; padding: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🎨 SLICK LICKS</h1>
          <p class="subtitle">AI Design & Content Generator</p>
        </header>
        
        <div class="controls">
          <div class="button-group">
            <button class="btn-design" onclick="generateDesign()">🎨 Generate Design</button>
            <button class="btn-content" onclick="generateContent()">✍️ Generate Content</button>
            <button class="btn-both" onclick="generateBoth()">⚡ Generate Both</button>
          </div>
          <div id="status" class="status"></div>
        </div>

        <div id="gallery" class="gallery">
          <div class="empty">Click a button to generate designs and content!</div>
        </div>
      </div>

      <script>
        async function generateDesign() {
          await generate('design');
        }
        
        async function generateContent() {
          await generate('content');
        }
        
        async function generateBoth() {
          await generate('both');
        }

        async function generate(type) {
          const status = document.getElementById('status');
          const gallery = document.getElementById('gallery');
          
          status.className = 'status show loading';
          status.textContent = '⏳ Generating...';
          
          try {
            const response = await fetch('/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type })
            });
            
            if (!response.ok) throw new Error('Generation failed');
            
            const data = await response.json();
            
            status.className = 'status show success';
            status.textContent = '✅ Generated successfully!';
            
            gallery.innerHTML = '';
            
            if (data.designs) {
              data.designs.forEach(design => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = \`
                  <div class="card-image">
                    <img src="\${design.imageUrl}" alt="Design" onerror="this.parentElement.textContent='Image loading...'">
                  </div>
                  <div class="card-content">
                    <div class="card-title">T-Shirt Design</div>
                    <div class="card-text">\${design.prompt}</div>
                    <div class="card-actions">
                      <a href="\${design.imageUrl}" target="_blank">View</a>
                      <button onclick="downloadImage('\${design.imageUrl}', 'design')">Download</button>
                    </div>
                  </div>
                \`;
                gallery.appendChild(card);
              });
            }
            
            if (data.content) {
              data.content.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = \`
                  <div class="card-image" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                    <div style="text-align: center;">📝 Content #\${idx + 1}</div>
                  </div>
                  <div class="card-content">
                    <div class="card-title">Social Media Post</div>
                    <div class="card-text">\${item}</div>
                    <div class="card-actions">
                      <button onclick="copyToClipboard('\${item.replace(/'/g, "\\\\'")}')">Copy</button>
                    </div>
                  </div>
                \`;
                gallery.appendChild(card);
              });
            }
          } catch (error) {
            status.className = 'status show error';
            status.textContent = '❌ Error: ' + error.message;
          }
        }

        function downloadImage(url, name) {
          const a = document.createElement('a');
          a.href = url;
          a.download = name + '-' + Date.now() + '.png';
          a.click();
        }

        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.post("/generate", async (c) => {
  const { type } = await c.req.json();
  const result = {};

  try {
    if (type === "design" || type === "both") {
      const prompt =
        designPrompts[Math.floor(Math.random() * designPrompts.length)];

      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
          },
        }
      );

      const imageUrl = output[0];

      result.designs = [
        {
          prompt: prompt,
          imageUrl: imageUrl,
        },
      ];
    }

    if (type === "content" || type === "both") {
      const contentItems = [];

      for (let i = 0; i < 3; i++) {
        const prompt =
          contentPrompts[Math.floor(Math.random() * contentPrompts.length)];

        const message = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 150,
        });

        contentItems.push(message.choices[0].message.content);
      }

      result.content = contentItems;
    }

    return c.json(result);
  } catch (error) {
    console.error("Generation error:", error);
    return c.json(
      { error: error.message },
      500
    );
  }
});

serve(app, { port: 8080 });
console.log("🚀 Slick Licks Generator running on port 8080");

