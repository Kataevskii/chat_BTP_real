document.addEventListener('DOMContentLoaded', function() {
    const imageUpload = document.getElementById('imageUpload');
    const analyzeButton = document.getElementById('analyzeButton');
    const resultDiv = document.getElementById('result');
    const loadingIndicator = document.getElementById('loading');
    const uploadedImageDisplay = document.getElementById('uploadedImage');
    const statusDiv = document.createElement('div');
    const explanationDiv = document.createElement('div');

    statusDiv.classList.add('result-text');
    explanationDiv.classList.add('result-text');

    resultDiv.appendChild(statusDiv);
    resultDiv.appendChild(explanationDiv);

    let isAnalyzing = false;

    imageUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImageDisplay.src = e.target.result;
                uploadedImageDisplay.style.display = 'block';
                statusDiv.textContent = '';
                explanationDiv.textContent = '';
                statusDiv.classList.remove('dangerous', 'not-dangerous', 'no-fissure');
            };
            reader.readAsDataURL(file);
        }
    });

    analyzeButton.addEventListener('click', function() {
        if (isAnalyzing) {
            return;
        }

        statusDiv.textContent = '';
        explanationDiv.textContent = '';
        statusDiv.classList.remove('dangerous', 'not-dangerous', 'no-fissure');

        if (!imageUpload.files || imageUpload.files.length === 0) {
            resultDiv.textContent = "Veuillez d'abord télécharger une image.";
            return;
        }

        loadingIndicator.style.display = 'block';
        isAnalyzing = true;
        analyzeButton.classList.add('analyzing');

        const file = imageUpload.files[0];
        const reader = new FileReader();
        reader.onloadend = function() {
            const base64data = reader.result.split(',')[1];

            analyzeImageWithGemini(base64data)
                .then(result => {
                    loadingIndicator.style.display = 'none';
                    isAnalyzing = false;
                    analyzeButton.classList.remove('analyzing');

                    statusDiv.textContent = result.status;
                    explanationDiv.textContent = result.explanation;

                    if (result.status === "Dangereux") {
                        statusDiv.classList.add('dangerous');
                    } else if (result.status === "Pas dangereux") {
                        statusDiv.classList.add('not-dangerous');
                    } else if (result.status === "Pas de Fissure") {
                        statusDiv.classList.add('no-fissure');
                    }
                })
                .catch(error => {
                    loadingIndicator.style.display = 'none';
                    isAnalyzing = false;
                    analyzeButton.classList.remove('analyzing');
                    resultDiv.textContent = "Erreur lors de l'analyse de l'image : " + error.message;
                });
        };
        reader.readAsDataURL(file);
    });

    async function analyzeImageWithGemini(base64Image) {
        const apiKey = 'AIzaSyCDADOebCIT4B0Ldo2vbN27wn2saa68MmE'; // Replace with your actual API key
        const model = 'gemini-2.0-flash-lite';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `Analysez cette image.
        1. Déterminez s'il y a une fissure.
        2. Si une fissure est présente, déterminez si elle semble dangereuse ou non dangereuse.
        3. Fournissez une réponse courte indiquant UNIQUEMENT l'un des éléments suivants : "Dangereux", "Pas dangereux" ou "Pas de Fissure".
        4. Faites suivre la réponse courte d'une explication détaillée.`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }, {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                }]
            }]
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates[0].content.parts[0].text;

            const statusMatch = textResponse.match(/(Dangereux|Pas dangereux|Pas de Fissure)/i);
            const status = statusMatch ? statusMatch[0] : "Inconnu";

            let explanation = textResponse.replace(status, '').trim();
            explanation = explanation.replace(/^[^a-zA-Z0-9]+/, '');

            return {
                status: status,
                explanation: explanation
            };

        } catch (error) {
            console.error("Gemini API error:", error);
            throw error;
        }
    }
});