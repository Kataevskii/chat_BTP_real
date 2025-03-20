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
        statusDiv.textContent = '';
        explanationDiv.textContent = '';
        statusDiv.classList.remove('dangerous', 'not-dangerous', 'no-fissure');

        if (!imageUpload.files || imageUpload.files.length === 0) {
            resultDiv.textContent = "Please upload an image first.";
            return;
        }

        loadingIndicator.style.display = 'block';

        const file = imageUpload.files[0];
        const reader = new FileReader();
        reader.onloadend = function() {
            const base64data = reader.result.split(',')[1];

            analyzeImageWithGemini(base64data)
                .then(result => {
                    loadingIndicator.style.display = 'none';

                    statusDiv.textContent = result.status;
                    explanationDiv.textContent = result.explanation;

                    if (result.status === "Dangerous") {
                        statusDiv.classList.add('dangerous');
                    } else if (result.status === "Not Dangerous") {
                        statusDiv.classList.add('not-dangerous');
                    } else if (result.status === "No Fissure") {
                        statusDiv.classList.add('no-fissure');
                    }
                })
                .catch(error => {
                    loadingIndicator.style.display = 'none';
                    resultDiv.textContent = "Error analyzing image: " + error.message;
                });
        };
        reader.readAsDataURL(file);
    });

    async function analyzeImageWithGemini(base64Image) {
        const apiKey = 'AIzaSyCDADOebCIT4B0Ldo2vbN27wn2saa68MmE';
        const model = 'gemini-2.0-flash-lite';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `Analyze this image. 
        1.  Determine if there is a fissure.
        2.  If a fissure is present, assess if it appears dangerous or not dangerous.
        3.  Provide a short answer stating ONLY one of the following: "Dangerous", "Not Dangerous", or "No Fissure".
        4.  Follow the short answer with a detailed explanation.`;

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

            // More robust parsing using regular expressions
            const statusMatch = textResponse.match(/(Dangerous|Not Dangerous|No Fissure)/i);
            const status = statusMatch ? statusMatch[0] : "Unknown"; // Default to "Unknown"

            // Extract the explanation after the status, removing leading non-alphanumeric characters
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