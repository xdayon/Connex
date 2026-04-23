import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function listModelsDirectly() {
  console.log("Consultando a API do Google diretamente...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.error) {
      console.error("Erro da API:", data.error.message);
      console.error("Detalhes:", JSON.stringify(data.error, null, 2));
      return;
    }

    console.log("Modelos encontrados:");
    if (data.models) {
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(`- ${m.name.replace("models/", "")}`);
        }
      });
    } else {
      console.log("Nenhum modelo retornado. Resposta completa:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Erro na requisição:", error.message);
  }
}

listModelsDirectly();
