const axios = require('axios');
const fs = require('fs');

async function readFromGoogleSheets() {
    const apiKey = process.env.API_KEY;
    const spreadsheetId = '1zhYMukAGvyqYvXwwsIkdLRlhOJIF_AZM4G4yToH9jbg';
    const range = 'Hidden!J12:AG12'; // Specify the range you want to read

    const keys = [
        "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH", "BUKIT PANJANG", "CENTRAL AREA", "CHOA CHU KANG",
        "CLEMENTI", "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST", "KALLANG", "PASIR RIS", "PUNGGOL", "QUEENSTOWN",
        "SEMBAWANG", "SENGKANG", "SERANGOON", "TAMPINES", "TOA PAYOH", "WOODLANDS", "YISHUN"
    ];

    try {
        const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`);
        let values = response.data.values[0];

        // Process the retrieved values as needed
        values = values.map(value => {
            if (value === '') {
                return 0;
            } else {
                return Math.ceil(Number(value));
            }
        });

        const prices = {};
        keys.forEach((key, index) => {
            prices[key] = values[index];
        });

        fs.writeFileSync('prices.json', JSON.stringify(prices, null, 2));
    } catch (error) {
        console.error('Error reading from Google Sheets:', error);
    }
}

readFromGoogleSheets();