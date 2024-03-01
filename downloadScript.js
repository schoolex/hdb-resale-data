import fetch from 'node-fetch';
import fs from 'fs';

function downloadCSV() {
  const apiUrl = "https://api-production.data.gov.sg/v2/internal/api/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/initiate-download";

  const headers = {
    "accept": "*/*",
    "accept-language": "en-GB,en;q=0.9",
    "content-type": "application/json",
    "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site"
  };

  const payload = {
    "headers": {
      "x-dgs-admin-api-key": ""
    }
  };

  const options = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  };

  console.log("Obtain download link....")
  fetch(apiUrl, options)
    .then(response => response.json())
    .then(data => {
      let csvUrl = data.url;
      console.log("Downloading CSV...")
      return fetch(csvUrl);
    })
    .then(response => response.text())
    .then(csvContent => {
      console.log("Saving CSV...")
      fs.writeFileSync('output.csv', csvContent);
    })
    .catch(error => console.error('Error:', error));
}

function processCSV(path) {
  console.log("Reading CSV...")
  fs.readFile(path, 'utf8', function(err, csvContent) {
    if (err) {
      console.error('Error:', err);
      return;
    }

    console.log("Processing CSV...")
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const results = {};

    for(let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const data = headers.reduce((obj, header, index) => {
        obj[header] = row[index];
        return obj;
      }, {});
      
      // Skip rows with missing or undefined values
      if (!data.month || !data.town || !data.flat_type || !data.resale_price) {
        continue;
      }
      
      if (!results[data.month]) {
        results[data.month] = {};
      }
      if (!results[data.month][data.town]) {
        results[data.month][data.town] = {};
      }
      if (!results[data.month][data.town][data.flat_type]) {
        results[data.month][data.town][data.flat_type] = {
          sum: 0,
          count: 0,
        };
      }
      results[data.month][data.town][data.flat_type].sum += parseInt(data.resale_price, 10);
      results[data.month][data.town][data.flat_type].count += 1;
    }

    const averages = JSON.parse(JSON.stringify(results));
    for (const month in averages) {
      for (const town in averages[month]) {
        for (const flat_type in averages[month][town]) {
          averages[month][town][flat_type] = Math.round(averages[month][town][flat_type].sum / averages[month][town][flat_type].count);
        }
      }
    }
    fs.writeFile('averages.json', JSON.stringify(averages, null, 2), 'utf8', function(err) {
      if (err) {
        console.error('Error:', err);
        return;
      }
      console.log('Averages written to averages.json');
    });
  });
}

processCSV('output.csv');